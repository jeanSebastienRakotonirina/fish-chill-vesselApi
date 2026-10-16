<template>
  <div>
    <AiInsightsBanner />

    <div class="page-header">
      <h2>{{ t('map.title') }}</h2>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
        <label class="map-toggle">
          <input type="checkbox" v-model="showAis" @change="onToggleAis" />
          <span>📡 AIS live</span>
        </label>
        <button
          class="btn"
          style="border: 1px solid var(--border); background: transparent; color: var(--text);"
          @click="syncAis"
          :disabled="loading || syncing"
        >
          {{ syncing ? '…' : '🔄 Sync DB' }}
        </button>
        <button class="btn btn-primary" @click="loadAll" :disabled="loading">
          {{ loading ? t('common.loading') : t('common.refresh') }}
        </button>
      </div>
    </div>

    <div v-if="aisMessage" class="card" :style="{ borderColor: aisOk ? 'var(--success)' : 'var(--warning)', marginBottom: '1rem', fontSize: '0.9rem' }">
      {{ aisMessage }}
    </div>

    <div v-if="error" class="card" style="border-color: var(--danger); margin-bottom: 1rem;">
      {{ error }}
    </div>

    <div class="grid-4">
      <div class="card">
        <div class="card-title">{{ t('map.vessels') }} (DB)</div>
        <div class="card-value">{{ dbVessels.length }}</div>
      </div>
      <div class="card">
        <div class="card-title">AIS live</div>
        <div class="card-value" style="color: var(--primary)">{{ aisVessels.length }}</div>
      </div>
      <div class="card">
        <div class="card-title">{{ t('map.online') }}</div>
        <div class="card-value" style="color: var(--success)">
          {{ mapVessels.filter(v => v.isOnline).length }}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Sur la carte</div>
        <div class="card-value">{{ mapVessels.filter(hasPos).length }}</div>
      </div>
    </div>

    <div class="card" style="padding: 0; margin-bottom: 1.5rem;">
      <VesselMap
        ref="mapRef"
        :vessels="mapVessels"
        :selected-id="selectedId"
        height="480px"
        @select="selectedId = $event"
      />
    </div>

    <div class="card">
      <h3 style="margin-bottom: 1rem;">
        {{ showAis && aisVessels.length ? 'Navires AIS (VesselAPI)' : t('map.listTitle') }}
      </h3>
      <table v-if="listVessels.length">
        <thead>
          <tr>
            <th>{{ t('map.name') }}</th>
            <th>Source</th>
            <th>{{ t('map.status') }}</th>
            <th>{{ t('map.position') }}</th>
            <th>{{ t('map.speed') }}</th>
            <th>MMSI / IMO</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in listVessels" :key="v._id || v.externalId">
            <td>
              <span :class="['status-dot', v.isOnline ? 'status-online' : 'status-offline']"></span>
              <strong>{{ v.name }}</strong>
            </td>
            <td>
              <span :class="['badge', v.source === 'vesselapi' ? 'badge-info' : 'badge-success']">
                {{ v.source === 'vesselapi' ? 'AIS' : 'DB' }}
              </span>
            </td>
            <td>
              <span v-if="v.status" :class="['badge', statusBadge(v.status)]">
                {{ t('status.' + (v.status || 'au_port')) }}
              </span>
              <span v-else style="color: var(--text-muted);">—</span>
            </td>
            <td>
              <span v-if="hasPos(v)">
                {{ Number(v.position.lat).toFixed(3) }}, {{ Number(v.position.lng).toFixed(3) }}
              </span>
              <span v-else style="color: var(--warning);">{{ t('map.noPosition') }}</span>
            </td>
            <td>{{ v.position?.speed != null ? v.position.speed + ' ' + t('common.knots') : t('common.none') }}</td>
            <td style="font-size: 0.8rem; color: var(--text-muted);">
              <span v-if="v.mmsi">MMSI {{ v.mmsi }}</span>
              <span v-if="v.imo"><br>IMO {{ v.imo }}</span>
              <span v-if="!v.mmsi && !v.imo">—</span>
            </td>
            <td style="white-space: nowrap;">
              <button
                v-if="hasPos(v)"
                class="btn btn-sm"
                style="margin-right: 0.35rem; border: 1px solid var(--border); background: transparent; color: var(--text);"
                @click="locate(v)"
              >📍</button>
              <button
                v-if="v.source === 'vesselapi' && (v.mmsi || v.imo)"
                class="btn btn-sm btn-primary"
                style="margin-right: 0.35rem;"
                @click="importOne(v)"
                :disabled="syncing"
                title="Importer dans la base"
              >⬇ Import</button>
              <router-link
                v-if="v._id && v.source !== 'vesselapi'"
                :to="`/navire/${v._id}`"
                class="btn btn-sm btn-primary"
              >{{ t('common.detail') }}</router-link>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="!loading" class="empty-state">
        {{ showAis ? 'Aucun navire AIS dans la zone (clé API ? zone trop vide ?)' : t('common.noVessels') }}
      </div>
      <div v-else class="loading">{{ t('common.loading') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getVessels,
  getVesselApiStatus,
  getLiveAisVessels,
  syncAllVesselsAis,
} from '../services/api'
import api from '../services/api'
import VesselMap from '../components/VesselMap.vue'
import AiInsightsBanner from '../components/AiInsightsBanner.vue'

const { t } = useI18n()

const dbVessels = ref([])
const aisVessels = ref([])
const loading = ref(false)
const syncing = ref(false)
const error = ref(null)
const selectedId = ref(null)
const mapRef = ref(null)
const showAis = ref(true)
const aisConfigured = ref(null)
const aisMessage = ref('')
const aisOk = ref(true)

const BBOX = {
  latBottom: 47.6,
  latTop: 48.2,
  lonLeft: -4.8,
  lonRight: -3.6,
}

const hasPos = (v) =>
  Number.isFinite(Number(v?.position?.lat)) &&
  Number.isFinite(Number(v?.position?.lng)) &&
  v.position.lat !== null &&
  v.position.lng !== null

const mapVessels = computed(() => {
  const db = dbVessels.value.map((v) => ({ ...v, source: 'db' }))
  if (!showAis.value) return db

  const dbMmsi = new Set(db.filter((v) => v.mmsi).map((v) => String(v.mmsi)))
  const aisOnly = aisVessels.value.filter(
    (v) => v.mmsi && !dbMmsi.has(String(v.mmsi))
  )
  return [
    ...db,
    ...aisOnly.map((v) => ({
      ...v,
      _id: `ais-${v.mmsi || v.externalId}`,
      isOnline: true,
      status: 'en_mer',
    })),
  ]
})

const listVessels = computed(() => {
  if (showAis.value && aisVessels.value.length) {
    return mapVessels.value
  }
  return dbVessels.value.map((v) => ({ ...v, source: 'db' }))
})

function locate(v) {
  selectedId.value = null
  const id = String(v._id || `ais-${v.mmsi}`)
  setTimeout(() => {
    selectedId.value = id
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, 0)
}

const statusBadge = (s) =>
  ({
    en_mer: 'badge-info',
    au_port: 'badge-success',
    maintenance: 'badge-warning',
    hors_service: 'badge-danger',
  }[s] || 'badge-info')

async function loadDb() {
  const { data } = await getVessels()
  dbVessels.value = data || []
}

async function loadAis() {
  if (!showAis.value) {
    aisVessels.value = []
    return
  }
  try {
    const { data } = await getLiveAisVessels(BBOX)
    aisVessels.value = (data?.vessels || []).filter((v) => v.position?.lat != null)
    if (!aisVessels.value.length && data?.count === 0) {
      aisMessage.value =
        'VesselAPI a répondu 0 navire dans la zone. Vérifie la clé API ou élargis la bbox.'
      aisOk.value = false
    } else if (aisVessels.value.length) {
      aisMessage.value = `${aisVessels.value.length} navires AIS chargés depuis VesselAPI`
      aisOk.value = true
    }
  } catch (e) {
    aisVessels.value = []
    aisOk.value = false
    const msg = e?.response?.data?.error || e.message
    const code = e?.response?.data?.code
    if (code === 'VESSELAPI_NOT_CONFIGURED' || e?.response?.status === 503) {
      aisMessage.value =
        'VESSELAPI_API_KEY absente dans backend/.env — les navires AIS ne peuvent pas être chargés.'
    } else {
      aisMessage.value = `Erreur VesselAPI : ${msg}`
    }
  }
}

async function loadAll() {
  loading.value = true
  error.value = null
  aisMessage.value = ''
  try {
    await loadDb()
    await loadAis()
  } catch (e) {
    error.value =
      e?.response?.status === 401 ? t('common.errorGeneric') : t('common.errorBackend')
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function onToggleAis() {
  if (showAis.value) {
    loading.value = true
    await loadAis()
    loading.value = false
  } else {
    aisVessels.value = []
    aisMessage.value = ''
  }
}

async function checkAis() {
  try {
    const { data } = await getVesselApiStatus()
    aisConfigured.value = data.configured
    if (!data.configured) {
      aisMessage.value =
        'Ajoute VESSELAPI_API_KEY dans backend/.env puis redémarre le serveur.'
      aisOk.value = false
    }
  } catch {
    aisConfigured.value = false
  }
}

async function syncAis() {
  syncing.value = true
  aisMessage.value = ''
  try {
    const { data } = await syncAllVesselsAis()
    aisOk.value = true
    aisMessage.value = `Positions DB mises à jour : ${data.updated}/${data.total}`
    await loadDb()
  } catch (e) {
    aisOk.value = false
    aisMessage.value = e?.response?.data?.error || 'Erreur sync AIS → DB'
  } finally {
    syncing.value = false
  }
}

async function importOne(v) {
  syncing.value = true
  aisMessage.value = ''
  try {
    const { data } = await api.post('/vessels/external/import', {
      name: v.name,
      mmsi: v.mmsi,
      imo: v.imo,
      callSign: v.callSign,
      position: v.position,
    })
    aisOk.value = true
    aisMessage.value = `Importé : ${data.vessel?.name || v.name}`
    await loadDb()
  } catch (e) {
    aisOk.value = false
    aisMessage.value = e?.response?.data?.error || 'Échec import'
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  checkAis()
  loadAll()
})
</script>

<style scoped>
.map-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
}
.map-toggle input {
  accent-color: var(--primary);
}
.map-toggle:has(input:checked) {
  border-color: var(--primary);
  color: var(--primary);
}
</style>