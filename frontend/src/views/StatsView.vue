<template>
  <div>
    <div class="page-header">
      <h2>{{ t('stats.title') }}</h2>
      <button class="btn btn-primary" @click="load" :disabled="loading">{{ t('common.refresh') }}</button>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 style="margin-bottom: 1rem;">{{ t('stats.bySpecies') }}</h3>
        <div v-if="stats.bySpecies?.length">
          <div
            v-for="s in stats.bySpecies"
            :key="s._id"
            style="margin-bottom: 0.75rem;"
          >
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="text-transform: capitalize;">{{ s._id }}</span>
              <strong>{{ s.totalKg?.toLocaleString() }} {{ t('common.kg') }}</strong>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{
                  width: (s.totalKg / maxSpecies * 100) + '%',
                  background: 'var(--primary)'
                }"
              ></div>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              {{ s.count }} {{ t('stats.captures') }}
            </div>
          </div>
        </div>
        <div v-else class="empty-state" style="padding: 1.5rem;">{{ t('common.noData') }}</div>
      </div>

      <div class="card">
        <h3 style="margin-bottom: 1rem;">{{ t('stats.byDay') }}</h3>
        <div v-if="stats.byDay?.length">
          <table>
            <thead>
              <tr>
                <th>{{ t('stats.date') }}</th>
                <th>{{ t('stats.totalKg') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in stats.byDay" :key="d._id">
                <td>{{ d._id }}</td>
                <td><strong>{{ d.totalKg?.toLocaleString() }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state" style="padding: 1.5rem;">{{ t('common.noData') }}</div>
      </div>
    </div>

    <div class="card" style="margin-top: 1.5rem;" v-if="stats.bySpecies?.length">
      <div class="card-title">{{ t('stats.totalCaught') }}</div>
      <div class="card-value" style="color: var(--primary);">
        {{ totalKg.toLocaleString() }} {{ t('common.kg') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCatchStats } from '../services/api'

const { t } = useI18n()
const stats = ref({ bySpecies: [], byDay: [] })
const loading = ref(false)

const maxSpecies = computed(() =>
  Math.max(...(stats.value.bySpecies?.map(s => s.totalKg) || [1]), 1)
)

const totalKg = computed(() =>
  (stats.value.bySpecies || []).reduce((sum, s) => sum + (s.totalKg || 0), 0)
)

async function load() {
  loading.value = true
  try {
    const { data } = await getCatchStats()
    stats.value = data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
