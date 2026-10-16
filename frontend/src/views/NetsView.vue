<template>
  <div>
    <div class="page-header">
      <h2>{{ t('nets.title') }}</h2>
      <button class="btn btn-primary" @click="load" :disabled="loading">{{ t('common.refresh') }}</button>
    </div>

    <div v-if="activeAlerts.length" style="margin-bottom: 1.5rem;">
      <h3 style="margin-bottom: 0.75rem; color: var(--warning);">⚠ {{ t('nets.activeAlerts') }} ({{ activeAlerts.length }})</h3>
      <div
        v-for="a in activeAlerts"
        :key="a.netId + a.alert._id"
        :class="['alert-item', a.alert.type === 'usure' && a.wearLevel >= 90 ? 'critical' : '']"
      >
        <div style="flex: 1;">
          <strong>{{ a.vesselName }} – {{ a.identifier }}</strong>
          <div style="font-size: 0.9rem; margin-top: 2px;">{{ a.alert.message }}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
            {{ t('nets.wearLabel') }}: {{ a.wearLevel }}% · {{ formatDate(a.alert.createdAt) }}
          </div>
        </div>
        <button class="btn btn-sm btn-primary" @click="ack(a.netId, a.alert._id)">{{ t('common.ack') }}</button>
      </div>
    </div>

    <div class="card">
      <table v-if="nets.length">
        <thead>
          <tr>
            <th>{{ t('nets.identifier') }}</th>
            <th>{{ t('nets.vessel') }}</th>
            <th>{{ t('nets.type') }}</th>
            <th>{{ t('nets.wear') }}</th>
            <th>{{ t('nets.status') }}</th>
            <th>{{ t('nets.lastInspection') }}</th>
            <th>{{ t('nets.alerts') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in nets" :key="n._id">
            <td><strong>{{ n.identifier }}</strong></td>
            <td>{{ n.vessel?.name || t('common.none') }}</td>
            <td>{{ n.type }}</td>
            <td style="min-width: 140px;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>{{ n.wearLevel }}%</span>
                <div class="progress-bar" style="flex: 1;">
                  <div
                    class="progress-fill"
                    :style="{
                      width: n.wearLevel + '%',
                      background: n.wearLevel >= 90 ? 'var(--danger)' : n.wearLevel >= 70 ? 'var(--warning)' : 'var(--success)'
                    }"
                  ></div>
                </div>
              </div>
            </td>
            <td>
              <span :class="['badge', netBadge(n.status)]">{{ t('netStatus.' + n.status) }}</span>
            </td>
            <td style="font-size: 0.85rem; color: var(--text-muted);">
              {{ formatDate(n.lastInspection) }}
            </td>
            <td>
              <span v-if="n.alerts?.filter(a => !a.acknowledged).length" class="badge badge-warning">
                {{ n.alerts.filter(a => !a.acknowledged).length }}
              </span>
              <span v-else style="color: var(--text-muted);">{{ t('common.none') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="!loading" class="empty-state">{{ t('common.noNets') }}</div>
      <div v-else class="loading">{{ t('common.loading') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getNets, acknowledgeAlert } from '../services/api'

const { t, locale } = useI18n()
const nets = ref([])
const loading = ref(false)

const activeAlerts = computed(() => {
  const list = []
  nets.value.forEach(n => {
    (n.alerts || []).filter(a => !a.acknowledged).forEach(a => {
      list.push({
        netId: n._id,
        identifier: n.identifier,
        vesselName: n.vessel?.name || t('common.none'),
        wearLevel: n.wearLevel,
        alert: a
      })
    })
  })
  return list
})

const netBadge = (s) => ({
  operationnel: 'badge-success', a_inspecter: 'badge-warning', a_remplacer: 'badge-danger', hors_service: 'badge-danger'
}[s] || 'badge-info')

const formatDate = (d) => d ? new Date(d).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR') : t('common.none')

async function load() {
  loading.value = true
  try {
    const { data } = await getNets()
    nets.value = data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function ack(netId, alertId) {
  try {
    await acknowledgeAlert(netId, alertId)
    await load()
  } catch (e) {
    console.error(e)
  }
}

onMounted(load)
</script>
