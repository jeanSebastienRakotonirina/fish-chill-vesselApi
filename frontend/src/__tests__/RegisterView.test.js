import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import RegisterView from '../views/RegisterView.vue'
import fr from '../i18n/locales/fr.json'
import en from '../i18n/locales/en.json'

vi.mock('../services/auth', () => ({
  register: vi.fn(),
}))

import { register } from '../services/auth'

const i18n = createI18n({ legacy: false, locale: 'fr', messages: { fr, en } })

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/register', component: RegisterView },
      { path: '/app', component: { template: '<div>app</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/', component: { template: '<div>home</div>' } },
    ],
  })
}

describe('RegisterView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche le formulaire d\'inscription avec choix de rôle', async () => {
    const router = makeRouter()
    await router.push('/register')
    const wrapper = mount(RegisterView, { global: { plugins: [i18n, router] } })

    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/Inscription|Sign up/)
    const options = wrapper.findAll('option').map((o) => o.element.value)
    expect(options).toContain('terre')
    expect(options).toContain('embarque')
    expect(options).toContain('client')
  })

  it('affiche le champ société si rôle client', async () => {
    const router = makeRouter()
    await router.push('/register')
    const wrapper = mount(RegisterView, { global: { plugins: [i18n, router] } })

    await wrapper.find('select').setValue('client')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toMatch(/Société|Company/)
  })

  it('appelle register et redirige', async () => {
    register.mockResolvedValue({ token: 't', user: { role: 'terre' } })
    const router = makeRouter()
    await router.push('/register')
    const pushSpy = vi.spyOn(router, 'push')

    const wrapper = mount(RegisterView, { global: { plugins: [i18n, router] } })
    const inputs = wrapper.findAll('input')
    // firstName, lastName, email, password
    await inputs[0].setValue('Marie')
    await inputs[1].setValue('Dupont')
    await inputs[2].setValue('marie@cfto.fr')
    await inputs[3].setValue('demo123')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(register).toHaveBeenCalled()
    expect(pushSpy).toHaveBeenCalledWith('/app')
  })
})
