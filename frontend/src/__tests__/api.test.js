import { describe, it, expect, vi } from 'vitest'

// Test that API module exports expected functions
import * as api from '../services/api'

describe('API service exports', () => {
  it('exporte les fonctions navires', () => {
    expect(typeof api.getVessels).toBe('function')
    expect(typeof api.getVessel).toBe('function')
    expect(typeof api.getVesselDashboard).toBe('function')
  })

  it('exporte les fonctions captures', () => {
    expect(typeof api.getCatches).toBe('function')
    expect(typeof api.getCatchStats).toBe('function')
  })

  it('exporte les fonctions filets', () => {
    expect(typeof api.getNets).toBe('function')
    expect(typeof api.acknowledgeAlert).toBe('function')
  })

  it('exporte les fonctions IA', () => {
    expect(typeof api.getAiInsights).toBe('function')
    expect(typeof api.aiChat).toBe('function')
  })

  it('exporte health', () => {
    expect(typeof api.getHealth).toBe('function')
  })
})
