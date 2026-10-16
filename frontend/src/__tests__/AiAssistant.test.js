import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import AiAssistant from '../components/AiAssistant.vue'
import fr from '../i18n/locales/fr.json'
import en from '../i18n/locales/en.json'

vi.mock('../services/api', () => ({
  aiChat: vi.fn(),
}))

import { aiChat } from '../services/api'

const i18n = createI18n({ legacy: false, locale: 'fr', messages: { fr, en } })

describe('AiAssistant', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche le bouton flottant par défaut', () => {
    const wrapper = mount(AiAssistant, { global: { plugins: [i18n] } })
    expect(wrapper.find('.ai-fab').exists()).toBe(true)
    expect(wrapper.find('.ai-panel').exists()).toBe(false)
  })

  it('ouvre le panneau au clic', async () => {
    const wrapper = mount(AiAssistant, { global: { plugins: [i18n] } })
    await wrapper.find('.ai-fab').trigger('click')
    expect(wrapper.find('.ai-panel').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/Assistant/)
  })

  it('envoie un message et affiche la réponse', async () => {
    aiChat.mockResolvedValue({
      data: { reply: 'Voici le résumé flotte.', source: 'local' },
    })

    const wrapper = mount(AiAssistant, { global: { plugins: [i18n] } })
    await wrapper.find('.ai-fab').trigger('click')

    const input = wrapper.find('.ai-input-row input')
    await input.setValue('résumé flotte')
    await wrapper.find('form.ai-input-row').trigger('submit.prevent')
    await flushPromises()

    expect(aiChat).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Voici le résumé flotte.')
  })

  it('suggestions cliquables', async () => {
    aiChat.mockResolvedValue({
      data: { reply: 'OK', source: 'local' },
    })

    const wrapper = mount(AiAssistant, { global: { plugins: [i18n] } })
    await wrapper.find('.ai-fab').trigger('click')

    const chips = wrapper.findAll('.ai-chip')
    expect(chips.length).toBeGreaterThan(0)
    await chips[0].trigger('click')
    await flushPromises()
    expect(aiChat).toHaveBeenCalled()
  })
})
