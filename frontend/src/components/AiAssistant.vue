<template>
  <!-- Bouton flottant -->
  <button
    v-if="!open"
    class="ai-fab"
    @click="open = true"
    :title="t('ai.open')"
  >
    🤖
  </button>

  <!-- Panneau chat -->
  <div v-else class="ai-panel">
    <div class="ai-header">
      <div>
        <strong>🤖 {{ t('ai.title') }}</strong>
        <span class="ai-badge">{{ t('ai.free') }}</span>
      </div>
      <button class="ai-close" @click="open = false">✕</button>
    </div>

    <div class="ai-messages" ref="messagesEl">
      <div class="ai-msg bot">
        {{ t('ai.welcome') }}
      </div>
      <div
        v-for="(m, i) in messages"
        :key="i"
        :class="['ai-msg', m.role]"
      >
        <div class="ai-msg-text" v-html="formatMsg(m.text)"></div>
        <div v-if="m.source" class="ai-source">{{ m.source === 'groq' ? 'Groq Llama' : t('ai.local') }}</div>
      </div>
      <div v-if="loading" class="ai-msg bot typing">{{ t('ai.thinking') }}</div>
    </div>

    <div class="ai-suggestions">
      <button
        v-for="s in suggestions"
        :key="s"
        class="ai-chip"
        @click="send(s)"
        :disabled="loading"
      >{{ s }}</button>
    </div>

    <form class="ai-input-row" @submit.prevent="send(input)">
      <input
        v-model="input"
        :placeholder="t('ai.placeholder')"
        :disabled="loading"
        autocomplete="off"
      />
      <button type="submit" class="btn btn-primary btn-sm" :disabled="loading || !input.trim()">
        ↑
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { aiChat } from '../services/api'

const { t, locale } = useI18n()
const open = ref(false)
const input = ref('')
const messages = ref([])
const loading = ref(false)
const messagesEl = ref(null)

const suggestions = computed(() =>
  locale.value === 'en'
    ? ['Fleet summary', 'Risky nets', 'Low fuel', 'How to view catches?']
    : ['Résumé flotte', 'Filets à risque', 'Carburant bas', 'Comment voir les captures ?']
)

function formatMsg(text) {
  return (text || '')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

async function send(text) {
  const msg = (text || input.value || '').trim()
  if (!msg || loading.value) return

  messages.value.push({ role: 'user', text: msg })
  input.value = ''
  loading.value = true
  await scrollDown()

  try {
    const { data } = await aiChat(msg, locale.value)
    messages.value.push({
      role: 'bot',
      text: data.reply,
      source: data.source,
    })
  } catch (e) {
    messages.value.push({
      role: 'bot',
      text: t('ai.error'),
    })
  } finally {
    loading.value = false
    await scrollDown()
  }
}

async function scrollDown() {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

watch(open, (v) => {
  if (v) scrollDown()
})
</script>

<style scoped>
.ai-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(14, 165, 233, 0.45);
  z-index: 1000;
  transition: transform 0.15s;
}
.ai-fab:hover {
  transform: scale(1.08);
}

.ai-panel {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 380px;
  max-width: calc(100vw - 2rem);
  height: 520px;
  max-height: calc(100vh - 3rem);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  overflow: hidden;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(99, 102, 241, 0.1));
}

.ai-badge {
  font-size: 0.65rem;
  background: rgba(34, 197, 94, 0.2);
  color: var(--success);
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  margin-left: 0.5rem;
  font-weight: 600;
}

.ai-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}
.ai-close:hover {
  color: var(--text);
}

.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.ai-msg {
  max-width: 90%;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  font-size: 0.875rem;
  line-height: 1.45;
}

.ai-msg.bot {
  background: var(--bg);
  border: 1px solid var(--border);
  align-self: flex-start;
  border-bottom-left-radius: 3px;
}

.ai-msg.user {
  background: var(--primary);
  color: white;
  align-self: flex-end;
  border-bottom-right-radius: 3px;
}

.ai-msg.typing {
  color: var(--text-muted);
  font-style: italic;
}

.ai-source {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 0.35rem;
}

.ai-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0 0.75rem 0.5rem;
}

.ai-chip {
  font-size: 0.72rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.ai-chip:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}
.ai-chip:disabled {
  opacity: 0.5;
}

.ai-input-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid var(--border);
}

.ai-input-row input {
  flex: 1;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  font-family: inherit;
}
.ai-input-row input:focus {
  outline: none;
  border-color: var(--primary);
}
</style>
