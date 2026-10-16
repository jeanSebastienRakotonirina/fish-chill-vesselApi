import { describe, it, expect } from 'vitest'
import { createI18n } from 'vue-i18n'
import fr from '../i18n/locales/fr.json'
import en from '../i18n/locales/en.json'

describe('i18n locales', () => {
  it('FR et EN ont les mêmes clés de premier niveau', () => {
    const frKeys = Object.keys(fr).sort()
    const enKeys = Object.keys(en).sort()
    expect(frKeys).toEqual(enKeys)
  })

  it('clés auth présentes en FR', () => {
    expect(fr.auth.loginTitle).toBeTruthy()
    expect(fr.auth.registerTitle).toBeTruthy()
    expect(fr.roles.embarque).toBe('Embarqué')
    expect(fr.roles.terre).toBe('À terre')
    expect(fr.roles.client).toBe('Client externe')
  })

  it('clés AI présentes', () => {
    expect(fr.ai.title).toBeTruthy()
    expect(en.ai.title).toBeTruthy()
    expect(fr.ai.insightsTitle).toBeTruthy()
  })

  it('i18n instance traduit correctement', () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'fr',
      messages: { fr, en },
    })
    expect(i18n.global.t('nav.map')).toBe('Carte & Flotte')
    i18n.global.locale.value = 'en'
    expect(i18n.global.t('nav.map')).toBe('Map & Fleet')
  })
})
