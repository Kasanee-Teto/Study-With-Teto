import { useEffect, useMemo, useState } from 'react'
import { I18nContext } from './I18nContext.js'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, translations } from './translations.js'

const LANGUAGE_STORAGE_KEY = 'app_language'

function getInitialLanguage() {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (SUPPORTED_LANGUAGES.includes(saved)) return saved

  const browserLanguage = navigator.language.split('-')[0]
  return SUPPORTED_LANGUAGES.includes(browserLanguage) ? browserLanguage : DEFAULT_LANGUAGE
}

function translate(language, key, substitutions = {}) {
  const keys = key.split('.')
  let value = translations[language]

  for (const item of keys) {
    value = value?.[item]
  }

  if (typeof value !== 'string') return key

  return value.replace(/\{\{(\w+)\}\}/g, (match, placeholder) => {
    return substitutions[placeholder] || match
  })
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage)

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language])

  const value = useMemo(() => {
    return {
      language,
      t: (key, substitutions) => translate(language, key, substitutions),
      toggleLanguage: () => {
        setLanguage((prev) => (prev === 'en' ? 'id' : 'en'))
      }
    }
  }, [language])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}
