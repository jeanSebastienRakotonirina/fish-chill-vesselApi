import api from './api'

const TOKEN_KEY = 'fishchill-token'
const USER_KEY = 'fishchill-user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated() {
  return !!getToken()
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  setAuth(data.token, data.user)
  return data
}

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload)
  setAuth(data.token, data.user)
  return data
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me')
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  return data.user
}

export function logout() {
  clearAuth()
}

// Intercepteur : ajoute le token à chaque requête
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur : déconnexion si 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      clearAuth()
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register') &&
          window.location.pathname !== '/') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)
