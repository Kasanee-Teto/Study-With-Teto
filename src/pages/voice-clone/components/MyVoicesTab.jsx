import { useEffect, useState } from 'react'

import { useTranslation } from '../../../i18n/useTranslation.js'
import { listVoiceModels } from '../../../services/voiceCloneService.js'
import VoiceCard from './VoiceCard.jsx'

export default function MyVoicesTab() {
  const { t } = useTranslation()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const list = await listVoiceModels()
        if (mounted) setModels(list)
      } catch (err) {
        if (mounted) setError(err.message || t('voiceClone.loadVoicesFailed'))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [t])

  function handleDeleted(id) {
    setModels((prev) => prev.filter((model) => model._id !== id))
  }

  if (loading) {
    return (
      <div className="vc-list-loading">
        <span className="vc-spinner" /> {t('voiceClone.loadingVoices')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="vc-banner vc-banner--error">
        <span className="vc-banner-icon" aria-hidden="true">!</span>
        {error}
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="vc-empty">
        <div className="vc-empty-icon" aria-hidden="true">{'\uD83C\uDFA4'}</div>
        <div className="vc-empty-text">{t('voiceClone.emptyVoices')}</div>
      </div>
    )
  }

  return (
    <div className="vc-voices-grid">
      {models.map((model) => (
        <VoiceCard key={model._id} model={model} onDeleted={handleDeleted} />
      ))}
    </div>
  )
}
