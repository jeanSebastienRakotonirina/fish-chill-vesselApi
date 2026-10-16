<template>
  <div class="landing">
    <header class="landing-header">
      <div class="landing-logo">🐟 Fish&Chill</div>
      <div class="landing-lang">
        <button :class="['lang-btn', locale === 'fr' ? 'active' : '']" @click="switchLang('fr')">FR</button>
        <button :class="['lang-btn', locale === 'en' ? 'active' : '']" @click="switchLang('en')">EN</button>
      </div>
    </header>

    <section class="hero">
      <div class="hero-content">
        <h1>{{ t('landing.title') }}</h1>
        <p class="hero-subtitle">{{ t('landing.subtitle') }}</p>
        <p class="hero-desc">{{ t('landing.description') }}</p>
        <div class="hero-actions">
          <router-link to="/login" class="btn btn-primary btn-lg">{{ t('landing.login') }}</router-link>
          <router-link to="/register" class="btn btn-outline btn-lg">{{ t('landing.register') }}</router-link>
        </div>
      </div>
      <div class="hero-stats">
        <div class="stat-card">
          <div class="stat-value">17+</div>
          <div class="stat-label">{{ t('landing.statVessels') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">95+</div>
          <div class="stat-label">{{ t('landing.statUsers') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">24/7</div>
          <div class="stat-label">{{ t('landing.statSync') }}</div>
        </div>
      </div>
    </section>

    <section class="features">
      <h2>{{ t('landing.featuresTitle') }}</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🗺️</div>
          <h3>{{ t('landing.featMap') }}</h3>
          <p>{{ t('landing.featMapDesc') }}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎣</div>
          <h3>{{ t('landing.featCatch') }}</h3>
          <p>{{ t('landing.featCatchDesc') }}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🕸️</div>
          <h3>{{ t('landing.featNets') }}</h3>
          <p>{{ t('landing.featNetsDesc') }}</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📡</div>
          <h3>{{ t('landing.featSync') }}</h3>
          <p>{{ t('landing.featSyncDesc') }}</p>
        </div>
      </div>
    </section>

    <section class="roles-section">
      <h2>{{ t('landing.rolesTitle') }}</h2>
      <div class="roles-grid">
        <div class="role-card">
          <div class="role-badge badge-info">{{ t('roles.embarque') }}</div>
          <p>{{ t('landing.roleEmbarque') }}</p>
        </div>
        <div class="role-card">
          <div class="role-badge badge-success">{{ t('roles.terre') }}</div>
          <p>{{ t('landing.roleTerre') }}</p>
        </div>
        <div class="role-card">
          <div class="role-badge badge-warning">{{ t('roles.client') }}</div>
          <p>{{ t('landing.roleClient') }}</p>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <p>CFTO – Concarneau · Fish&Chill</p>
      <p>2026 &copy; Jean-Sébastien Rakotonirina 07.67.80.75.38, tous droits réservés</p>
    </footer>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'

const { t, locale } = useI18n()
function switchLang(lang) { setLocale(lang) }
</script>

<style scoped>
.landing {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

.landing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 2.5rem;
  border-bottom: 1px solid var(--border);
}

.landing-logo {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--primary);
}

.landing-lang {
  display: flex;
  gap: 0.4rem;
}

.lang-btn {
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.lang-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.hero {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 3rem;
  padding: 4rem 2.5rem 3rem;
  max-width: 1100px;
  margin: 0 auto;
  align-items: center;
}

@media (max-width: 800px) {
  .hero { grid-template-columns: 1fr; }
}

.hero h1 {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 0.75rem;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: var(--primary);
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.hero-desc {
  color: var(--text-muted);
  margin-bottom: 2rem;
  max-width: 480px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-lg {
  padding: 0.75rem 1.75rem;
  font-size: 1rem;
  border-radius: 8px;
  font-weight: 600;
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--primary);
  color: var(--primary);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.btn-outline:hover {
  background: rgba(14, 165, 233, 0.1);
}

.hero-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
  text-align: center;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--primary);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.features, .roles-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 2.5rem 3rem;
}

.features h2, .roles-section h2 {
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
}

.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  text-align: center;
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.feature-card h3 {
  font-size: 1rem;
  margin-bottom: 0.4rem;
}

.feature-card p {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
}

.role-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
}

.role-badge {
  display: inline-block;
  margin-bottom: 0.6rem;
}

.role-card p {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.landing-footer {
  text-align: center;
  padding: 1.5rem;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.85rem;
}
</style>
