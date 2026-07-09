import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useTranslation } from '../../i18n/useTranslation.js'
import { ROUTES } from '../../routes/paths.js'
import { TAB } from './constants.js'
import CloneTab from './components/CloneTab.jsx'
import MyVoicesTab from './components/MyVoicesTab.jsx'
import './voice-clone.css'

export default function VoiceClone() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(TAB.CLONE)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleCloneSuccess() {
    setTimeout(() => {
      setRefreshKey((key) => key + 1)
      setActiveTab(TAB.VOICES)
    }, 2000)
  }

  return (
    <div className="vc-page">
      <header className="vc-header">
        <Link to={ROUTES.DASHBOARD} className="vc-back">
          <span aria-hidden="true">&larr;</span> {t('voiceClone.back')}
        </Link>

        <div className="vc-title-group">
          <h1 className="vc-title">{t('voiceClone.title')}</h1>
          <p className="vc-subtitle">{t('voiceClone.subtitle')}</p>
        </div>

        <div style={{ width: 72 }} />
      </header>

      <div className="vc-tabs" style={{ width: '100%', maxWidth: 820 }}>
        <button
          className={`vc-tab ${activeTab === TAB.CLONE ? 'is-active' : ''}`}
          onClick={() => setActiveTab(TAB.CLONE)}
        >
          <span aria-hidden="true">{'\uD83C\uDFA4'}</span> {t('voiceClone.cloneVoiceTab')}
        </button>

        <button
          className={`vc-tab ${activeTab === TAB.VOICES ? 'is-active' : ''}`}
          onClick={() => setActiveTab(TAB.VOICES)}
        >
          <span aria-hidden="true">{'\uD83D\uDDC2'}</span> {t('voiceClone.myVoicesTab')}
        </button>
      </div>

      <main className="vc-card">
        {activeTab === TAB.CLONE && (
          <CloneTab onSuccess={handleCloneSuccess} />
        )}

        {activeTab === TAB.VOICES && (
          <MyVoicesTab key={refreshKey} />
        )}
      </main>
    </div>
  )
}
