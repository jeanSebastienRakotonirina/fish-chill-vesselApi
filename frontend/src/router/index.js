import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated, getUser } from '../services/auth'
import LandingView from '../views/LandingView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import MapView from '../views/MapView.vue'
import CatchesView from '../views/CatchesView.vue'
import NetsView from '../views/NetsView.vue'
import StatsView from '../views/StatsView.vue'
import VesselDetailView from '../views/VesselDetailView.vue'

const routes = [
  { path: '/', name: 'landing', component: LandingView, meta: { public: true } },
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { public: true } },
  { path: '/app', name: 'map', component: MapView, meta: { requiresAuth: true } },
  { path: '/captures', name: 'catches', component: CatchesView, meta: { requiresAuth: true } },
  { path: '/filets', name: 'nets', component: NetsView, meta: { requiresAuth: true } },
  { path: '/stats', name: 'stats', component: StatsView, meta: { requiresAuth: true } },
  { path: '/navire/:id', name: 'vessel', component: VesselDetailView, props: true, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authed = isAuthenticated()

  if (to.meta.requiresAuth && !authed) {
    return next('/login')
  }
  // Si déjà connecté, rediriger loin des pages auth
  if (authed && (to.name === 'login' || to.name === 'register' || to.name === 'landing')) {
    return next('/app')
  }
  next()
})

export default router
