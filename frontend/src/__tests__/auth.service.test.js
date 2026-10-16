import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const store = {}
vi.stubGlobal('localStorage', {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: (k) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
})

// Import after mock
import {
  setAuth,
  getToken,
  getUser,
  clearAuth,
  isAuthenticated,
  logout,
} from '../services/auth'

describe('auth service', () => {
  beforeEach(() => {
    clearAuth()
  })

  it('setAuth stocke token et user', () => {
    setAuth('tok123', { email: 'a@b.fr', role: 'terre' })
    expect(getToken()).toBe('tok123')
    expect(getUser().email).toBe('a@b.fr')
    expect(isAuthenticated()).toBe(true)
  })

  it('clearAuth / logout efface tout', () => {
    setAuth('tok', { email: 'x@y.fr' })
    logout()
    expect(getToken()).toBeNull()
    expect(getUser()).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })

  it('isAuthenticated false sans token', () => {
    expect(isAuthenticated()).toBe(false)
  })
})
