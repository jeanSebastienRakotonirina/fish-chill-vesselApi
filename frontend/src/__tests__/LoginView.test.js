import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import fr from '../i18n/locales/fr.json'
import en from '../i18n/locales/en.json'

vi.mock('../services/auth', () => ({
  login: vi.fn(),
}))

import { login } from '../services/auth'

const i18n = createI18n({ legacy: false, locale: 'fr', messages: { fr, en } })

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/app', component: { template: '<div>app</div>' } },
      { path: '/register', component: { template: '<div>reg</div>' } },
      { path: '/', component: { template: '<div>home</div>' } },
    ],
  })
}

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le formulaire de connexion', async () => {
    const router = makeRouter()
    await router.push('/login')
    const wrapper = mount(LoginView, { global: { plugins: [i18n, router] } })

    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/Connexion|Sign in/)
  })

  it('soumet et redirige vers /app en cas de succès', async () => {
    login.mockResolvedValue({ token: 't', user: { role: 'terre' } })
    const router = makeRouter()
    await router.push('/login')
    const pushSpy = vi.spyOn(router, 'push')

    const wrapper = mount(LoginView, { global: { plugins: [i18n, router] } })
    await wrapper.find('input[type="email"]').setValue('admin@cfto.fr')
    await wrapper.find('input[type="password"]').setValue('demo123')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(login).toHaveBeenCalledWith('admin@cfto.fr', 'demo123')
    expect(pushSpy).toHaveBeenCalledWith('/app')
  })

  it('affiche une erreur en cas d\'échec', async () => {
    login.mockRejectedValue({ response: { data: { error: 'Identifiants incorrects' } } })
    const router = makeRouter()
    await router.push('/login')

    const wrapper = mount(LoginView, { global: { plugins: [i18n, router] } })
    await wrapper.find('input[type="email"]').setValue('bad@x.fr')
    await wrapper.find('input[type="password"]').setValue('wrong')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Identifiants incorrects')
  })
})
