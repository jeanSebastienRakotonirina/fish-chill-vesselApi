<<template>
  <!-- Pages publiques : landing, login, register (sans sidebar) -->
  <router-view v-if="isPublic" />

  <!-- App authentifiée avec sidebar -->
  <div v-else class="app-layout" :class="{ 'sidebar-open': mobileMenuOpen }">
    <!-- Overlay mobile -->
    <div class="sidebar-overlay" v-if="mobileMenuOpen" @click="closeMobileMenu"></div>

    <aside class="sidebar" :class="{ open: mobileMenuOpen }">
      <div class="sidebar-logo">
        <h1>
          🐟 {{ t('app.name') }}
          <span>{{ t('app.tagline') }}</span>
        </h1>
        <button class="sidebar-close" @click="closeMobileMenu" aria-label="Close menu">✕</button>
      </div>
      <nav>
        <router-link to="/app" class="nav-link" @click="closeMobileMenu">
          <span>🗺️</span> <span>{{ t('nav.map') }}</span>
        </router-link>
        <router-link to="/captures" class="nav-link" @click="closeMobileMenu">
          <span>🎣</span> <span>{{ t('nav.catches') }}</span>
        </router-link>
        <router-link v-if="canWrite" to="/filets" class="nav-link" @click="closeMobileMenu">
          <span>🕸️</span> <span>{{ t('nav.nets') }}</span>
        </router-link>
        <router-link to="/stats" class="nav-link" @click="closeMobileMenu">
          <span>📊</span> <span>{{ t('nav.stats') }}</span>
        </router-link>
      </nav>

      <div class="user-info" v-if="user">
        <div class="user-name">{{ user.firstName }} {{ user.lastName }}</div>
        <div class="user-role">{{ t('roles.' + user.role) }}</div>
        <button class="btn-logout" @click="doLogout">{{ t('auth.logout') }}</button>
      </div>

      <div class="lang-switcher">
        <button
          :class="['lang-btn', locale === 'fr' ? 'active' : '']"
          @click="switchLang('fr')"
        >{{ t('lang.fr') }}</button>
        <button
          :class="['lang-btn', locale === 'en' ? 'active' : '']"
          @click="switchLang('en')"
        >{{ t('lang.en') }}</button>
      </div>
    </aside>

    <main class="main-content">
      <!-- Top bar mobile -->
      <div class="mobile-topbar">
        <button class="hamburger" @click="toggleMobileMenu" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
        <div class="mobile-title">🐟 {{ t('app.name') }}</div>
        <div class="mobile-spacer"></div>
      </div>
      <router-view />
    </main>
    <AiAssistant />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from './i18n'
import { getUser, logout } from './services/auth'
import AiAssistant from './components/AiAssistant.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const user = ref(getUser())
const mobileMenuOpen = ref(false)

const isPublic = computed(() =>
  ['landing', 'login', 'register'].includes(route.name)
)

const canWrite = computed(() =>
  user.value && ['admin', 'terre', 'embarque'].includes(user.value.role)
)

function switchLang(lang) {
  setLocale(lang)
}

function doLogout() {
  logout()
  user.value = null
  mobileMenuOpen.value = false
  router.push('/')
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

// Close menu on resize to desktop
function onResize() {
  if (window.innerWidth > 768) {
    mobileMenuOpen.value = false
  }
}

onMounted(() => {
  user.value = getUser()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})

watch(() => route.name, () => {
  user.value = getUser()
  mobileMenuOpen.value = false
})
</script>

<style scoped>
.lang-switcher {
  display: flex;
  gap: 0.4rem;
  padding: 0.75rem 1.25rem 1rem;
}

.lang-btn {
  flex: 1;
  padding: 0.4rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.15s;
  cursor: pointer;
}

.lang-btn:hover {
  border-color: var(--primary);
  color: var(--text);
}

.lang-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.user-info {
  margin-top: auto;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border);
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.user-role {
  font-size: 0.75rem;
  color: var(--primary);
  margin-top: 2px;
  margin-bottom: 0.65rem;
}

.btn-logout {
  width: 100%;
  padding: 0.4rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-logout:hover {
  border-color: var(--danger);
  color: var(--danger);
  background: var(--danger-soft);
}

/* Mobile topbar & hamburger */
.mobile-topbar {
  display: none;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  margin-bottom: 0.5rem;
}

.mobile-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--primary);
  letter-spacing: -0.02em;
}

.mobile-spacer {
  flex: 1;
}

.hamburger {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  cursor: pointer;
  transition: border-color 0.15s;
}
.hamburger:hover {
  border-color: var(--primary);
}
.hamburger span {
  display: block;
  height: 2px;
  background: var(--text);
  border-radius: 1px;
  transition: transform 0.2s;
}

.sidebar-close {
  display: none;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  line-height: 1;
}
.sidebar-close:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .mobile-topbar {
    display: flex;
  }
  .sidebar-close {
    display: block;
  }
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 150;
    backdrop-filter: blur(2px);
  }
}
</style>