<template>
  <div class="vessel-map-wrap" :style="{ height: height }">
    <div ref="mapEl" class="vessel-map"></div>

    <div class="map-overlay map-overlay-top">
      <div class="map-layers" role="group">
        <button
          v-for="l in baseLayers"
          :key="l.id"
          :class="['map-chip', activeLayerId === l.id ? 'active' : '']"
          @click="setBaseLayer(l.id)"
        >{{ t(l.labelKey) }}</button>
        <button :class="['map-chip', seamarks ? 'active' : '']" @click="toggleSeamarks">⚓ {{ t('map.seamarks') }}</button>
      </div>
      <button v-if="!single" class="map-chip" @click="fitAll">⌖ {{ t('map.recenter') }}</button>
    </div>

    <div class="map-overlay map-overlay-bottom">
      <span class="map-legend"><i class="dot dot-online"></i>{{ t('map.legendOnline') }}</span>
      <span class="map-legend"><i class="dot dot-offline"></i>{{ t('map.legendOffline') }}</span>
      <span v-if="!single" class="map-legend">{{ t('map.positioned', { n: positionedCount, total: vessels.length }) }}</span>
    </div>

    <div v-if="notice" class="map-notice">{{ notice }}</div>
    <div v-else-if="vessels.length && !positionedCount" class="map-notice">{{ t('map.noVesselsWithPosition') }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  vessels: { type: Array, default: () => [] },
  height: { type: String, default: '460px' },
  selectedId: { type: String, default: null },
  autoFit: { type: Boolean, default: true }
})
const emit = defineEmits(['select'])

const { t } = useI18n()
const router = useRouter()

const mapEl = ref(null)
const activeLayerId = ref('street')
const seamarks = ref(true)
const notice = ref('')

let map = null
let baseLayer = null
let seamarkLayer = null
let resizeObs = null
let noticeTimer = null
let hasFitted = false
const markers = new Map() // id -> L.Marker
const tileErrors = { count: 0 }

// ── Fonds de carte : aucun ne nécessite de clé API ──────────────────────────
// Optionnel : VITE_MAP_TILE_URL (+ VITE_MAP_TILE_ATTRIBUTION) pour imposer votre propre fournisseur.
const customUrl = import.meta.env?.VITE_MAP_TILE_URL
const OSM = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19
}
const baseLayers = [
  ...(customUrl ? [{ id: 'custom', labelKey: 'map.layerStreet', name: 'Custom',
    url: customUrl, attribution: import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '', maxZoom: 19 }] : []),
  { id: 'street', labelKey: 'map.layerStreet', name: 'OpenStreetMap', ...OSM },
  { id: 'dark', labelKey: 'map.layerDark', name: 'OpenStreetMap (sombre)', ...OSM, className: 'tiles-dark' },
  { id: 'sat', labelKey: 'map.layerSat', name: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri', maxZoom: 18 }
]
if (customUrl) activeLayerId.value = 'custom'

function buildBaseLayer(def) {
  const layer = L.tileLayer(def.url, {
    attribution: def.attribution,
    maxZoom: def.maxZoom,
    className: def.className || '',
    crossOrigin: true
  })
  layer.on('tileerror', () => onTileError(def.id))
  layer.on('tileload', () => { tileErrors.count = 0 })
  return layer
}

function setBaseLayer(id) {
  const def = baseLayers.find(l => l.id === id)
  if (!def || !map) return
  if (baseLayer) map.removeLayer(baseLayer)
  tileErrors.count = 0
  activeLayerId.value = id
  baseLayer = buildBaseLayer(def).addTo(map)
  baseLayer.bringToBack()
}

// Si le fond actif échoue plusieurs fois de suite (clé requise, réseau, quota…), on bascule sur le suivant.
function onTileError(id) {
  if (id !== activeLayerId.value) return
  tileErrors.count++
  if (tileErrors.count < 6) return
  const idx = baseLayers.findIndex(l => l.id === id)
  const next = baseLayers[(idx + 1) % baseLayers.length]
  if (next && next.id !== id) {
    showNotice(t('map.tileFallback', { name: next.name }))
    setBaseLayer(next.id)
  }
}

function showNotice(msg) {
  notice.value = msg
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = ''), 6000)
}

function toggleSeamarks() {
  seamarks.value = !seamarks.value
  if (!map) return
  if (seamarks.value) seamarkLayer.addTo(map)
  else map.removeLayer(seamarkLayer)
}

// ── Navires ─────────────────────────────────────────────────────────────────
const single = computed(() => props.vessels.length === 1)
const hasPosition = (v) =>
  Number.isFinite(Number(v?.position?.lat)) && Number.isFinite(Number(v?.position?.lng)) &&
  v.position.lat !== null && v.position.lng !== null
const positioned = computed(() => props.vessels.filter(hasPosition))
const positionedCount = computed(() => positioned.value.length)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function vesselIcon(v) {
  const heading = Number.isFinite(Number(v.position?.heading)) ? Number(v.position.heading) : 0
  const moving = (v.position?.speed || 0) > 0.5
  const cls = ['vessel-pin', v.isOnline ? 'is-online' : 'is-offline', v.status === 'en_mer' ? 'at-sea' : '',
    v.status === 'hors_service' ? 'is-out' : '', String(v._id) === props.selectedId ? 'is-selected' : ''].join(' ')
  // Le triangle pivote selon le cap ; la pastille garde le nom lisible.
  const arrow = moving
    ? `<svg class="vessel-arrow" viewBox="0 0 24 24" style="transform:rotate(${heading}deg)"><path d="M12 2 L19 21 L12 17 L5 21 Z"/></svg>`
    : `<svg class="vessel-arrow" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>`
  return L.divIcon({
    className: 'vessel-icon',
    html: `<div class="${cls}">${arrow}<span class="vessel-label">${esc(v.name)}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16]
  })
}

function popupHtml(v) {
  const status = t('status.' + (v.status || 'au_port'))
  const speed = v.position?.speed ?? '–'
  const fuel = v.currentFuel != null ? Number(v.currentFuel).toLocaleString() : '–'
  const hdg = v.position?.heading != null ? `${Math.round(v.position.heading)}°` : '–'
  return `
    <div class="vessel-popup">
      <strong>${esc(v.name)}</strong>
      <div class="vp-status">${esc(status)} · ${v.isOnline ? t('common.online') : t('common.offline')}</div>
      <div>${t('map.popupSpeed')}: ${esc(speed)} ${t('common.knots')} · ${t('map.popupHeading')}: ${hdg}</div>
      <div>${t('map.popupFuel')}: ${fuel} ${t('common.liters')}</div>
      <a href="/navire/${encodeURIComponent(v._id)}" data-vessel="${esc(v._id)}">${t('map.popupDetail')}</a>
    </div>`
}

function renderMarkers() {
  if (!map) return
  const seen = new Set()

  positioned.value.forEach(v => {
    const id = String(v._id)
    seen.add(id)
    const latlng = [Number(v.position.lat), Number(v.position.lng)]
    let m = markers.get(id)
    if (!m) {
      m = L.marker(latlng, { icon: vesselIcon(v), riseOnHover: true, title: v.name }).addTo(map)
      m.bindPopup(popupHtml(v), { closeButton: true })
      m.on('click', () => emit('select', id))
      markers.set(id, m)
    } else {
      m.setLatLng(latlng)
      m.setIcon(vesselIcon(v))
      m.setPopupContent(popupHtml(v))
    }
    m.setZIndexOffset(v.status === 'en_mer' ? 500 : v.isOnline ? 200 : 0)
  })

  for (const [id, m] of markers) {
    if (!seen.has(id)) { m.remove(); markers.delete(id) }
  }

  if (props.autoFit && !hasFitted && positioned.value.length) {
    fitAll()
    hasFitted = true
  }
}

function fitAll() {
  if (!map) return
  const pts = positioned.value.map(v => [Number(v.position.lat), Number(v.position.lng)])
  if (!pts.length) return
  if (pts.length === 1) map.setView(pts[0], 11)
  else map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 12 })
}

function focusVessel(id) {
  const m = markers.get(String(id))
  if (!m || !map) return
  map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 11), { duration: 0.6 })
  m.openPopup()
}

// Navigation SPA depuis la popup (évite un rechargement complet)
function onPopupClick(e) {
  const a = e.target.closest?.('a[data-vessel]')
  if (!a) return
  e.preventDefault()
  router.push(`/navire/${a.dataset.vessel}`)
}

onMounted(() => {
  map = L.map(mapEl.value, { zoomControl: true, worldCopyJump: true }).setView([47.85, -4.1], 9)
  setBaseLayer(activeLayerId.value)
  seamarkLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openseamap.org">OpenSeaMap</a>', maxZoom: 18, opacity: 0.9
  })
  if (seamarks.value) seamarkLayer.addTo(map)

  map.getContainer().addEventListener('click', onPopupClick)

  // Le conteneur peut changer de taille après le montage (layout, sidebar, onglets)
  const fix = () => map && map.invalidateSize()
  setTimeout(fix, 0)
  setTimeout(fix, 300)
  if (typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(fix)
    resizeObs.observe(mapEl.value)
  }

  renderMarkers()
})

watch(() => props.vessels, renderMarkers, { deep: true })
watch(() => props.selectedId, (id) => { renderMarkers(); if (id) focusVessel(id) })

onBeforeUnmount(() => {
  clearTimeout(noticeTimer)
  if (resizeObs) resizeObs.disconnect()
  if (map) { map.getContainer().removeEventListener('click', onPopupClick); map.remove(); map = null }
  markers.clear()
})

defineExpose({ focusVessel, fitAll })
</script>

<style>
/* Non scoped : Leaflet injecte son propre HTML en dehors du scope Vue */
.vessel-map-wrap { position: relative; width: 100%; min-height: 240px; border-radius: var(--radius); overflow: hidden; isolation: isolate; }
.vessel-map { position: absolute; inset: 0; background: #0b1220; }
.vessel-map .tiles-dark { filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(0.8); }

/* Leaflet reste sous la sidebar et l'assistant IA */
.vessel-map .leaflet-pane, .vessel-map .leaflet-top, .vessel-map .leaflet-bottom { z-index: 1; }
.vessel-map .leaflet-pane { z-index: 1; }
.vessel-map .leaflet-popup-pane { z-index: 3; }
.vessel-map .leaflet-control { z-index: 2; }

.map-overlay { position: absolute; left: 0.6rem; right: 0.6rem; z-index: 5; display: flex; gap: 0.5rem; flex-wrap: wrap; pointer-events: none; }
.map-overlay > * { pointer-events: auto; }
.map-overlay-top { top: 0.6rem; justify-content: space-between; padding-left: 3rem; }
.map-overlay-bottom { bottom: 1.4rem; }
.map-layers { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.map-chip { background: rgba(15,23,42,0.88); color: var(--text); border: 1px solid var(--border); border-radius: 999px; padding: 0.25rem 0.7rem; font-size: 0.75rem; font-weight: 600; }
.map-chip:hover { border-color: var(--primary); }
.map-chip.active { background: var(--primary); border-color: var(--primary); color: #fff; }
.map-legend { background: rgba(15,23,42,0.88); border: 1px solid var(--border); border-radius: 999px; padding: 0.2rem 0.65rem; font-size: 0.72rem; color: var(--text); display: inline-flex; align-items: center; gap: 0.35rem; }
.map-legend .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.dot-online { background: #0ea5e9; } .dot-offline { background: #94a3b8; }
.map-notice { position: absolute; z-index: 6; left: 50%; top: 3.4rem; transform: translateX(-50%); background: rgba(245,158,11,0.95); color: #1c1100; padding: 0.4rem 0.9rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600; max-width: 90%; text-align: center; }

/* Marqueurs navires */
.vessel-icon { background: transparent; border: 0; overflow: visible; }
.vessel-pin { position: relative; width: 34px; height: 34px; border-radius: 50%; background: #94a3b8; border: 3px solid #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; }
.vessel-pin.is-online { background: #0ea5e9; }
.vessel-pin.is-out { background: #ef4444; }
.vessel-pin.is-selected { border-color: #facc15; transform: scale(1.15); }
.vessel-pin.at-sea::after { content: ''; position: absolute; inset: -7px; border-radius: 50%; border: 2px solid rgba(14,165,233,0.55); animation: vpulse 2s ease-out infinite; }
.vessel-arrow { width: 18px; height: 18px; fill: #fff; transition: transform 0.4s; }
.vessel-label { position: absolute; top: 38px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(15,23,42,0.92); color: #f1f5f9; border: 1px solid #334155; border-radius: 4px; padding: 0 0.35rem; font-size: 0.68rem; font-weight: 600; pointer-events: none; }
@keyframes vpulse { 0% { transform: scale(0.8); opacity: 0.9; } 100% { transform: scale(1.5); opacity: 0; } }

.vessel-popup { font-size: 0.82rem; line-height: 1.5; color: #0f172a; }
.vessel-popup strong { font-size: 0.95rem; }
.vessel-popup .vp-status { color: #475569; margin-bottom: 0.2rem; }
.vessel-popup a { color: #0284c7; font-weight: 600; }
</style>
