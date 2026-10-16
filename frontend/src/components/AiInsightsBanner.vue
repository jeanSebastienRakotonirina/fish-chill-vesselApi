<template>
  <div v-if="insights" class="insights-banner card">
    <div class="insights-header">
      <span>🧠 {{ t('ai.insightsTitle') }}</span>
      <button class="btn btn-sm btn-primary" @click="load" :disabled="loading">
        {{ loading ? '…' : t('common.refresh') }}
      </button>
    </div>
    <p class="insights-summary">{{ insights.summary }}</p>

    <div class="insights-grid" v-if="hasDetails">
      <div v-if="insights.criticalNets?.length" class="insight-block">
        <div class="insight-label">⚠️ {{ t('ai.riskyNets') }}</div>
        <div v-for="n in insights.criticalNets.slice(0, 3)" :key="n.id" class="insight-row">
          <span>{{ n.identifier }}</span>
          <span :class="['badge', n.risk === 'critical' ? 'badge-danger' : 'badge-warning']">
            {{ n.wearLevel }}%
          </span>
        </div>
      </div>

      <div v-if="insights.lowFuel?.length" class="insight-block">
        <div class="insight-label">⛽ {{ t('ai.lowFuel') }}</div>
        <div v-for="v in insights.lowFuel" :key="v.name" class="insight-row">
          <span>{{ v.name }}</span>
          <span class="badge badge-danger">{{ v.percent }}%</span>
        </div>
      </div>

      <div v-if="insights.catchTrend" class="insight-block">
        <div class="insight-label">📈 {{ t('ai.catchTrend') }}</div>
        <div class="insight-row">
          <span>{{ insights.catchTrend.last7daysKg?.toLocaleString() }} kg / 7j</span>
          <span
            v-if="insights.catchTrend.changePercent != null"
            :class="['badge', insights.catchTrend.direction === 'up' ? 'badge-success' : 'badge-warning']"
          >
            {{ insights.catchTrend.changePercent >= 0 ? '+' : '' }}{{ insights.catchTrend.changePercent }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAiInsights } from '../services/api'

const { t } = useI18n()
const insights = ref(null)
const loading = ref(false)

const hasDetails = computed(() =>
  insights.value &&
  (insights.value.criticalNets?.length ||
    insights.value.lowFuel?.length ||
    insights.value.catchTrend)
)

async function load() {
  loading.value = true
  try {
    const { data } = await getAiInsights()
    insights.value = data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.insights-banner {
  margin-bottom: 1.5rem;
  border-left: 3px solid var(--primary);
}

.insights-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.insights-summary {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.insight-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}

.insight-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  padding: 0.2rem 0;
}
</style>
