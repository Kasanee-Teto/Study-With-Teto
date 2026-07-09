import { useCallback, useEffect, useState } from 'react'
import { listVoiceModels } from '../../../services/voiceCloneService.js'
import VoiceCard from './VoiceCard.jsx'

export default function MyVoicesTab() {
  const [models,  setModels]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await listVoiceModels()
      setModels(list)
    } catch (err) {
      setError(err.message || 'Failed to load voices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleDeleted(id) {
    setModels((prev) => prev.filter((m) => m._id !== id))
  }

  if (loading) {
    return (
      <div className="vc-list-loading">
        <span className="vc-spinner" /> Loading voices…
      </div>
    )
  }

  if (error) {
    return (
      <div className="vc-banner vc-banner--error">
        <span className="vc-banner-icon">⚠</span>{error}
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="vc-empty">
        <div className="vc-empty-icon">🎙</div>
        <div className="vc-empty-text">No voice models yet — clone your first voice!</div>
      </div>
    )
  }

  return (
    <div className="vc-voices-grid">
      {models.map((m) => (
        <VoiceCard key={m._id} model={m} onDeleted={handleDeleted} />
      ))}
    </div>
  )
}

// ── Clone tab ─────────────────────────────────────────────────────────────
