import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '../../routes/paths.js'
import { TAB } from './constants.js'
import CloneTab from './components/CloneTab.jsx'
import MyVoicesTab from './components/MyVoicesTab.jsx'
import './voice-clone.css'

export default function VoiceClone() {
  const [activeTab, setActiveTab] = useState(TAB.CLONE)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleCloneSuccess() {
    // Switch to My Voices tab after successful clone so user can see it
    setTimeout(() => {
      setRefreshKey((k) => k + 1)
      setActiveTab(TAB.VOICES)
    }, 2000)
  }

  return (
    <div className="vc-page">
      {/* Header */}
      <header className="vc-header">
        <Link to={ROUTES.DASHBOARD} className="vc-back">← Back</Link>
        <div className="vc-title-group">
          <h1 className="vc-title">Voice Cloning Studio</h1>
          <p className="vc-subtitle">Powered by Fish Audio S2-Pro</p>
        </div>
        <div style={{ width: 72 }} />
      </header>

      {/* Tabs */}
      <div className="vc-tabs" style={{ width: '100%', maxWidth: 820 }}>
        <button
          className={`vc-tab ${activeTab === TAB.CLONE ? 'is-active' : ''}`}
          onClick={() => setActiveTab(TAB.CLONE)}
        >
          🎙 Clone Voice
        </button>
        <button
          className={`vc-tab ${activeTab === TAB.VOICES ? 'is-active' : ''}`}
          onClick={() => setActiveTab(TAB.VOICES)}
        >
          🗂 My Voices
        </button>
      </div>

      {/* Card */}
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
