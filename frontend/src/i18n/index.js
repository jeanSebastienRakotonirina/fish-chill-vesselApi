import { createI18n } from 'vue-i18n'
import fr from './locales/fr.json'
import en from './locales/en.json'

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('fishchill-locale') : null

const i18n = createI18n({
  legacy: false,
  locale: saved || 'fr',
  fallbackLocale: 'fr',
  messages: { fr, en },
  missingWarn: false,
  fallbackWarn: false,
  warnHtmlMessage: false,
})

export function setLocale(locale) {
  i18n.global.locale.value = locale
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('fishchill-locale', locale)
  }
  document.documentElement.lang = locale
}

export default i18n
