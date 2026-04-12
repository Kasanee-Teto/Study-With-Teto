import { useState, useEffect, useContext, createContext } from 'react'
import en from '../locales/en.json'
import id from '../locales/id.json'

const I18nContext = createContext()

const translations = { en, id }

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider')
  }
  return context
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('app_language')
    if (saved) return saved
    
    const browserLang = navigator.language.split('-')[0]
    return browserLang === 'id' ? 'id' : 'en'
  })

  useEffect(() => {
    localStorage.setItem('app_language', language)
  }, [language])

  const t = (key, substitutions = {}) => {
    const keys = key.split('.')
    let value = translations[language]
    
    for (const k of keys) {
      value = value?.[k]
    }
    
    if (typeof value !== 'string') return key
    
    return value.replace(/\{\{(\w+)\}\}/g, (match, placeholder) => {
      return substitutions[placeholder] || match
    })
  }

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'id' : 'en'))
  }

  return (
    <I18nContext.Provider value={{ language, t, toggleLanguage }}>
      {children}
    </I18nContext.Provider>
  )
}
