<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">🐟 Fish&Chill</div>
      <h2>{{ t('auth.loginTitle') }}</h2>
      <p class="auth-sub">{{ t('auth.loginSub') }}</p>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label>{{ t('auth.email') }}</label>
          <input v-model="email" type="email" required autocomplete="email" :placeholder="t('auth.emailPlaceholder')" />
        </div>
        <div class="form-group">
          <label>{{ t('auth.password') }}</label>
          <input v-model="password" type="password" required autocomplete="current-password" />
        </div>
        <div v-if="error" class="form-error">{{ error }}</div>
        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? t('common.loading') : t('auth.loginBtn') }}
        </button>
      </form>

      <p class="auth-switch">
        {{ t('auth.noAccount') }}
        <router-link to="/register">{{ t('auth.registerLink') }}</router-link>
      </p>
      <p class="auth-demo">
        {{ t('auth.demoAccounts') }}<br>
        <code>admin@cfto.fr</code> / <code>terre@cfto.fr</code> / <code>embarque@cfto.fr</code> / <code>client@externe.fr</code><br>
        {{ t('auth.demoPassword') }}: <code>demo123</code>
      </p>
      <router-link to="/" class="auth-back">{{ t('auth.backHome') }}</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { login } from '../services/auth'

const { t } = useI18n()
const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref(null)
const loading = ref(false)

async function submit() {
  error.value = null
  loading.value = true
  try {
    await login(email.value, password.value)
    router.push('/app')
  } catch (e) {
    error.value = e.response?.data?.error || t('auth.loginError')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 2rem;
}
.auth-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow);
}
.auth-logo {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 1.25rem;
}
.auth-card h2 {
  font-size: 1.4rem;
  margin-bottom: 0.3rem;
}
.auth-sub {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}
.form-group input, .form-group select {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 0.95rem;
  font-family: inherit;
}
.form-group input:focus, .form-group select:focus {
  outline: none;
  border-color: var(--primary);
}
.form-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: var(--danger);
  padding: 0.6rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}
.btn-full {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  margin-top: 0.5rem;
}
.auth-switch {
  text-align: center;
  margin-top: 1.25rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}
.auth-demo {
  margin-top: 1.25rem;
  padding: 0.75rem;
  background: var(--bg);
  border-radius: 8px;
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.6;
  text-align: center;
}
.auth-demo code {
  color: var(--primary);
  font-size: 0.75rem;
}
.auth-back {
  display: block;
  text-align: center;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}
</style>
