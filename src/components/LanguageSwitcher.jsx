import { useTranslation } from '../i18n/useTranslation.js'
import './LanguageSwitcher.css'

export default function LanguageSwitcher() {
  const { language, toggleLanguage } = useTranslation()

  return (
    <button
      className="language-switcher"
      onClick={toggleLanguage}
      aria-label={`Switch language to ${language === 'en' ? 'Indonesian' : 'English'}`}
      title={`Language: ${language.toUpperCase()}`}
    >
      {language.toUpperCase()}
    </button>
  )
}
