import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import fr from '../i18n/locales/fr.json'
import en from '../i18n/locales/en.json'

const i18n = createI18n({ legacy: false, locale: 'fr', messages: { fr, en } })
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: LandingView },
    { path: '/login', component: { template: '<div>login</div>' } },
    { path: '/register', component: { template: '<div>register</div>' } },
  ],
})

describe('LandingView', () => {
  it('affiche le titre et les boutons Connexion / Inscription', async () => {
    await router.push('/')
    const wrapper = mount(LandingView, {
      global: { plugins: [i18n, router] },
    })

    expect(wrapper.text()).toContain('Fish&Chill')
    expect(wrapper.text()).toMatch(/Connexion|Sign in/)
    expect(wrapper.text()).toMatch(/Inscription|Sign up/)
  })

  it('liens vers /login et /register', async () => {
    await router.push('/')
    const wrapper = mount(LandingView, {
      global: { plugins: [i18n, router] },
    })

    const links = wrapper.findAll('a')
    const hrefs = links.map((l) => l.attributes('href'))
    expect(hrefs).toContain('/login')
    expect(hrefs).toContain('/register')
  })
})
