<template>
  <div>
    <div class="page-header">
      <div>
        <router-link to="/app" style="font-size: 0.85rem; color: var(--text-muted);">{{ t('common.back') }}</router-link>
        <h2 style="margin-top: 0.25rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
          <template v-if="vessel">
            <span :class="['status-dot', vessel.isOnline ? 'status-online' : 'status-offline']"></span>
            {{ vessel.name }}
            <span :class="['badge', statusBadge(vessel.status)]">{{ t('status.' + (vessel.status || 'au_port')) }}</span>
            <span class="badge badge-info">{{ typeLabel }}</span>
          </template>
          <span v-else>{{ t('map.vessels') }}</span>
        </h2>
        <div v-if="vessel" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
          {{ vessel.isOnline ? t('common.online') : t('common.offline') }}
          · {{ t('vessel.lastSync') }} : {{ ago(vessel.lastSyncAt) }}
          <span v-if="updatedAt"> · {{ t('common.updatedAt') }} {{ timeOnly(updatedAt) }}</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <label style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
          <input type="checkbox" v-model="autoRefresh" /> {{ t('common.autoRefresh') }}
        </label>
        <button
          v-if="canSyncAis"
          class="btn"
          style="border: 1px solid var(--border); background: transparent; color: var(--text);"
          @click="syncAis"
          :disabled="syncing || loading"
        >
          {{ syncing ? '…' : '📡 AIS' }}
        </button>
        <button class="btn btn-primary" @click="load()" :disabled="loading">
          {{ loading ? t('common.loading') : t('common.refresh') }}
        </button>
      </div>
    </div>

    <div v-if="aisMsg" class="card" :style="{ borderColor: aisOk ? 'var(--success)' : 'var(--warning)', marginBottom: '1rem', fontSize: '0.9rem' }">
      {{ aisMsg }}
    </div>

    <div v-if="error" class="card" style="border-color: var(--danger); margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
      <span>{{ error }}</span>
      <button class="btn btn-sm btn-primary" @click="load()">{{ t('common.retry') }}</button>
    </div>
    <div v-if="loading && !dashboard" class="loading">{{ t('common.loading') }}</div>

    <template v-if="dashboard">
      <div v-if="lowFuel" class="card" style="border-color: var(--danger); background: rgba(239,68,68,0.08); margin-bottom: 1rem;">
        ⛽ <strong>{{ t('vessel.fuelLow') }}</strong> — {{ kpis.fuelPercent }}%
        ({{ fmt(kpis.currentFuelLiters) }} / {{ fmt(kpis.fuelCapacity) }} {{ t('common.liters') }})
      </div>

      <div class="grid-4">
        <div class="card">
          <div class="card-title">{{ t('vessel.totalCatches') }}</div>
          <div class="card-value">{{ fmt(kpis.totalCatchKg) }} {{ t('common.kg') }}</div>
          <div v-if="kpis.totalCatchCount != null" style="font-size: 0.8rem; color: var(--text-muted);">
            {{ kpis.totalCatchCount }} {{ t('stats.captures') }}
          </div>
        </div>
        <div class="card">
          <div class="card-title">⛽ {{ t('vessel.fuel') }}</div>
          <div class="card-value">
            {{ fmt(kpis.currentFuelLiters) }} {{ t('common.liters') }}
            <span v-if="kpis.fuelPercent != null" style="font-size: 1rem; color: var(--text-muted);">({{ kpis.fuelPercent }}%)</span>
          </div>
          <div class="progress-bar" v-if="kpis.fuelPercent != null">
            <div class="progress-fill" :style="{ width: Math.min(100, kpis.fuelPercent) + '%', background: kpis.fuelPercent < 20 ? 'var(--danger)' : kpis.fuelPercent < 40 ? 'var(--warning)' : 'var(--primary)' }"></div>
          </div>
          <div v-if="kpis.fuelCapacity != null" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">
            Capacité : {{ fmt(kpis.fuelCapacity) }} {{ t('common.liters') }}
          </div>
        </div>
        <div class="card">
          <div class="card-title">{{ t('vessel.activeNets') }}</div>
          <div class="card-value">{{ kpis.activeNets ?? 0 }}</div>
        </div>
        <div class="card">
          <div class="card-title">{{ t('vessel.netAlerts') }}</div>
          <div class="card-value" :style="{ color: kpis.netsAlert ? 'var(--warning)' : 'inherit' }">{{ kpis.netsAlert ?? 0 }}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom: 1.5rem;">
        <div class="card" style="padding: 0;">
          <VesselMap :vessels="[vessel]" height="340px" />
        </div>
        <div class="card">
          <h3 style="margin-bottom: 1rem;">{{ t('vessel.position') }}</h3>
          <div v-if="hasPos" class="info-grid">
            <div><div class="card-title">{{ t('vessel.latitude') }}</div>{{ dm(vessel.position.lat, true) }}</div>
            <div><div class="card-title">{{ t('vessel.longitude') }}</div>{{ dm(vessel.position.lng, false) }}</div>
            <div><div class="card-title">{{ t('vessel.speed') }}</div>{{ vessel.position.speed != null ? vessel.position.speed + ' ' + t('common.knots') : t('common.none') }}</div>
            <div>
              <div class="card-title">{{ t('vessel.heading') }}</div>
              <span v-if="vessel.position.heading != null">{{ Math.round(vessel.position.heading) }}° {{ compass(vessel.position.heading) }}</span>
              <span v-else>{{ t('common.none') }}</span>
            </div>
            <div style="grid-column: 1 / -1;">
              <div class="card-title">{{ t('vessel.positionAge') }}</div>{{ ago(vessel.position.updatedAt) }}
            </div>
          </div>
          <div v-else class="empty-state" style="padding: 1rem;">{{ t('vessel.noPosition') }}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 style="margin-bottom: 1rem;">{{ t('vessel.bySpecies') }}</h3>
          <div v-if="species.length">
            <div v-for="s in species" :key="s.name" style="margin-bottom: 0.65rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                <span style="text-transform: capitalize;">{{ s.name }}</span>
                <span>{{ fmt(s.kg) }} {{ t('common.kg') }} <span style="color: var(--text-muted);">({{ s.pct }}%)</span></span>
              </div>
              <div class="progress-bar"><div class="progress-fill" :style="{ width: s.pct + '%', background: 'var(--primary)' }"></div></div>
            </div>
          </div>
          <div v-else class="empty-state" style="padding: 1rem;">{{ t('common.noCatches') }}</div>
        </div>
        <div class="card">
          <h3 style="margin-bottom: 1rem;">{{ t('vessel.recentCatches') }}</h3>
          <table v-if="dashboard.recentCatches?.length">
            <thead><tr><th>{{ t('vessel.date') }}</th><th>{{ t('vessel.species') }}</th><th>{{ t('common.kg') }}</th><th>{{ t('vessel.quality') }}</th></tr></thead>
            <tbody>
              <tr v-for="c in dashboard.recentCatches" :key="c._id">
                <td style="font-size: 0.85rem;">{{ formatDate(c.catchDate) }}</td>
                <td style="text-transform: capitalize;">{{ c.species }}</td>
                <td>{{ c.quantityKg }}</td>
                <td><span :class="['badge', c.quality === 'A' ? 'badge-success' : 'badge-warning']">{{ c.quality }}</span></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state" style="padding: 1rem;">{{ t('common.noCatches') }}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top: 1.5rem;">
        <div class="card">
          <h3 style="margin-bottom: 1rem;">{{ t('vessel.nets') }}</h3>
          <table v-if="sortedNets.length">
            <thead><tr><th>{{ t('vessel.id') }}</th><th>{{ t('vessel.wear') }}</th><th>{{ t('nets.status') }}</th></tr></thead>
            <tbody>
              <tr v-for="n in sortedNets" :key="n._id">
                <td>{{ n.identifier }}</td>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    {{ n.wearLevel }}%
                    <div class="progress-bar" style="width: 60px;">
                      <div class="progress-fill" :style="{ width: Math.min(100, n.wearLevel) + '%', background: n.wearLevel >= 70 ? 'var(--warning)' : 'var(--success)' }"></div>
                    </div>
                  </div>
                </td>
                <td><span :class="['badge', n.status === 'operationnel' ? 'badge-success' : 'badge-warning']">{{ t('netStatus.' + n.status) }}</span></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state" style="padding: 1rem;">{{ t('common.noNets') }}</div>
        </div>

        <div class="card">
          <h3 style="margin-bottom: 1rem;">⛽ {{ t('vessel.fuelHistory') }}</h3>
          <div class="fuel-summary" v-if="vessel">
            <div class="fuel-row"><span>Niveau actuel</span><strong>{{ fmt(vessel.currentFuel) }} L</strong></div>
            <div class="fuel-row"><span>Capacité réservoir</span><strong>{{ vessel.capacity?.fuel != null ? fmt(vessel.capacity.fuel) + ' L' : '—' }}</strong></div>
            <div class="fuel-row" v-if="kpis.fuelPercent != null">
              <span>Remplissage</span>
              <strong :style="{ color: kpis.fuelPercent < 20 ? 'var(--danger)' : kpis.fuelPercent < 40 ? 'var(--warning)' : 'var(--success)' }">{{ kpis.fuelPercent }}%</strong>
            </div>
            <div class="progress-bar" style="margin: 0.75rem 0 1rem;" v-if="kpis.fuelPercent != null">
              <div class="progress-fill" :style="{ width: Math.min(100, kpis.fuelPercent) + '%', background: kpis.fuelPercent < 20 ? 'var(--danger)' : kpis.fuelPercent < 40 ? 'var(--warning)' : 'var(--primary)' }"></div>
            </div>
          </div>
          <table v-if="dashboard.recentFuel?.length">
            <thead><tr><th>{{ t('vessel.date') }}</th><th>{{ t('vessel.fuelType') }}</th><th>{{ t('vessel.fuelQty') }}</th><th>{{ t('vessel.fuelRemaining') }}</th></tr></thead>
            <tbody>
              <tr v-for="f in dashboard.recentFuel" :key="f._id">
                <td style="font-size: 0.85rem;">{{ formatDate(f.timestamp) }}</td>
                <td>
                  <span :class="['badge', f.type === 'ravitaillement' ? 'badge-success' : 'badge-info']">
                    {{ f.type === 'ravitaillement' ? t('vessel.fuelRefill') : t('vessel.fuelConsumption') }}
                  </span>
                </td>
                <td>{{ f.type === 'ravitaillement' ? '+' : '−' }}{{ fmt(f.quantityLiters) }} {{ t('common.liters') }}</td>
                <td>{{ f.remainingLiters != null ? fmt(f.remainingLiters) + ' ' + t('common.liters') : t('common.none') }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state" style="padding: 1rem;">{{ t('vessel.noFuelLogs') }}</div>
        </div>
      </div>

      <div class="card" style="margin-top: 1.5rem;">
        <h3 style="margin-bottom: 0.75rem;">{{ t('vessel.info') }}</h3>
        <div class="info-grid" style="font-size: 0.9rem;">
          <div><div class="card-title">{{ t('vessel.imo') }}</div>{{ vessel.imo || t('common.none') }}</div>
          <div><div class="card-title">MMSI</div>{{ vessel.mmsi || t('common.none') }}</div>
          <div><div class="card-title">{{ t('vessel.callSign') }}</div>{{ vessel.callSign || t('common.none') }}</div>
          <div><div class="card-title">{{ t('vessel.type') }}</div>{{ typeLabel }}</div>
          <div><div class="card-title">{{ t('vessel.status') }}</div>{{ t('status.' + (vessel.status || 'au_port')) }}</div>
          <div><div class="card-title">{{ t('vessel.lastSync') }}</div>{{ formatDate(vessel.lastSyncAt) }}</div>
          <div><div class="card-title">{{ t('vessel.fuelCapacity') }}</div>{{ vessel.capacity?.fuel != null ? fmt(vessel.capacity.fuel) + ' ' + t('common.liters') : t('common.none') }}</div>
          <div><div class="card-title">Carburant actuel</div>{{ vessel.currentFuel != null ? fmt(vessel.currentFuel) + ' ' + t('common.liters') : t('common.none') }}</div>
          <div><div class="card-title">{{ t('vessel.holds') }}</div>{{ vessel.capacity?.holds != null ? vessel.capacity.holds + ' m³' : t('common.none') }}</div>
          <div><div class="card-title">{{ t('vessel.created') }}</div>{{ formatDate(vessel.createdAt, true) }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getVesselDashboard, syncVesselAis } from '../services/api'
import VesselMap from '../components/VesselMap.vue'

const props = defineProps({ id: String })
const { t, locale } = useI18n()
const dashboard = ref(null)
const loading = ref(false)
const syncing = ref(false)
const error = ref(null)
const updatedAt = ref(null)
const autoRefresh = ref(true)
const aisMsg = ref('')
const aisOk = ref(true)
let timer = null

const vessel = computed(() => dashboard.value?.vessel || null)
const kpis = computed(() => dashboard.value?.kpis || {})
const lowFuel = computed(() => kpis.value.fuelPercent != null && kpis.value.fuelPercent < 20)
const hasPos = computed(() => {
  const p = vessel.value?.position
  return p && p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
})
const canSyncAis = computed(() => !!(vessel.value?.mmsi || vessel.value?.imo))

const typeLabel = computed(() => {
  const key = { chalutier: 'typeChalutier', senneur: 'typeSenneur', autre: 'typeAutre' }[vessel.value?.type]
  return key ? t('vessel.' + key) : (vessel.value?.type || t('common.none'))
})

const species = computed(() => {
  const by = kpis.value.bySpecies || {}
  const total = Object.values(by).reduce((a, b) => a + b, 0) || 1
  return Object.entries(by)
    .map(([name, kg]) => ({ name, kg, pct: Math.round((kg / total) * 100) }))
    .sort((a, b) => b.kg - a.kg)
})

const sortedNets = computed(() =>
  [...(dashboard.value?.nets || [])].sort((a, b) => (b.wearLevel || 0) - (a.wearLevel || 0))
)

const statusBadge = (s) =>
  ({ en_mer: 'badge-info', au_port: 'badge-success', maintenance: 'badge-warning', hors_service: 'badge-danger' }[s] || 'badge-info')
const loc = () => (locale.value === 'en' ? 'en-GB' : 'fr-FR')
const fmt = (n) => (n != null && Number.isFinite(Number(n)) ? Number(n).toLocaleString(loc()) : t('common.none'))
const timeOnly = (d) => new Date(d).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const formatDate = (d, dateOnly = false) => {
  if (!d) return t('common.none')
  const opts = dateOnly
    ? { day: '2-digit', month: '2-digit', year: 'numeric' }
    : { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
  return new Date(d).toLocaleString(loc(), opts)
}

function ago(d) {
  if (!d) return t('common.none')
  const mins = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000))
  if (mins < 1) return t('common.justNow')
  const label = mins < 60 ? t('common.minutes', { n: mins }) : mins < 1440 ? t('common.hours', { n: Math.round(mins / 60) }) : t('common.days', { n: Math.round(mins / 1440) })
  return t('common.ago', { t: label })
}

function dm(value, isLat) {
  const v = Number(value)
  const hemi = isLat ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'W')
  const abs = Math.abs(v)
  const deg = Math.floor(abs)
  const min = ((abs - deg) * 60).toFixed(3)
  return `${deg}°${min}' ${hemi}  (${v.toFixed(4)})`
}

function compass(deg) {
  const pts = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return pts[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]
}

async function load(silent = false) {
  if (!silent) loading.value = true
  error.value = null
  try {
    const { data } = await getVesselDashboard(props.id)
    dashboard.value = data
    updatedAt.value = new Date()
  } catch (e) {
    error.value = e?.response?.status === 404 ? t('common.notFound') : t('common.errorVessel')
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function syncAis() {
  if (!props.id) return
  syncing.value = true
  aisMsg.value = ''
  try {
    await syncVesselAis(props.id)
    aisOk.value = true
    aisMsg.value = 'Position AIS mise à jour'
    await load(true)
  } catch (e) {
    aisOk.value = false
    aisMsg.value = e?.response?.data?.error || 'Échec synchronisation AIS'
  } finally {
    syncing.value = false
  }
}

function schedule() {
  clearInterval(timer)
  if (autoRefresh.value) timer = setInterval(() => { if (!document.hidden) load(true) }, 30000)
}

onMounted(() => { load(); schedule() })
onBeforeUnmount(() => clearInterval(timer))
watch(autoRefresh, schedule)
watch(() => props.id, () => { dashboard.value = null; load() })
</script>

<style scoped>
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}
.fuel-summary {
  background: var(--bg-hover, rgba(255,255,255,0.03));
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  border: 1px solid var(--border);
}
.fuel-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  padding: 0.25rem 0;
  color: var(--text-muted);
}
.fuel-row strong { color: var(--text); }
</style>