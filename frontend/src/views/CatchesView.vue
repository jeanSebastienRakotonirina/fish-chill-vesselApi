<template>
  <div>
    <div class="page-header">
      <h2>{{ t('catches.title') }}</h2>
      <button class="btn btn-primary" @click="load" :disabled="loading">{{ t('common.refresh') }}</button>
    </div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <table v-if="catches.length">
        <thead>
          <tr>
            <th>{{ t('catches.date') }}</th>
            <th>{{ t('catches.vessel') }}</th>
            <th>{{ t('catches.species') }}</th>
            <th>{{ t('catches.quantity') }}</th>
            <th>{{ t('catches.quality') }}</th>
            <th>{{ t('catches.conservation') }}</th>
            <th>{{ t('catches.position') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in catches" :key="c._id">
            <td>{{ formatDate(c.catchDate) }}</td>
            <td>{{ c.vessel?.name || t('common.none') }}</td>
            <td><strong>{{ c.species }}</strong></td>
            <td>{{ c.quantityKg?.toLocaleString() }} {{ t('common.kg') }}</td>
            <td>
              <span :class="['badge', c.quality === 'A' ? 'badge-success' : c.quality === 'B' ? 'badge-warning' : 'badge-danger']">
                {{ c.quality }}
              </span>
            </td>
            <td>
              {{ c.conservation?.method || t('common.none') }}
              <span v-if="c.conservation?.temperature != null" style="color: var(--text-muted); font-size: 0.8rem;">
                ({{ c.conservation.temperature }}°C)
              </span>
            </td>
            <td style="font-size: 0.85rem; color: var(--text-muted);">
              <span v-if="c.position?.lat">{{ c.position.lat.toFixed(2) }}, {{ c.position.lng.toFixed(2) }}</span>
              <span v-else>{{ t('common.none') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="!loading" class="empty-state">{{ t('common.noCatches') }}</div>
      <div v-else class="loading">{{ t('common.loading') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCatches } from '../services/api'

const { t, locale } = useI18n()
const catches = ref([])
const loading = ref(false)

const formatDate = (d) => d ? new Date(d).toLocaleString(locale.value === 'en' ? 'en-GB' : 'fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : t('common.none')

async function load() {
  loading.value = true
  try {
    const { data } = await getCatches({ limit: 100 })
    catches.value = data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
