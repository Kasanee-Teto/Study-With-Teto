import { useState } from 'react'

import { useTranslation } from '../../../i18n/useTranslation.js'
import { createVoiceModel } from '../../../services/voiceCloneService.js'
import { MAX_SAMPLES, STAGE } from '../constants.js'
import SampleSlot from './SampleSlot.jsx'

function makeSample() {
  return { audio: '', mimeType: '', name: '', text: '' }
}

export default function CloneTab({ onSuccess }) {
  const { t } = useTranslation()
  const [samples, setSamples] = useState([makeSample()])
  const [voiceName, setVoiceName] = useState('')
  const [stage, setStage] = useState(STAGE.IDLE)
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)

  const step = voiceName.trim()
    ? (samples.every((sample) => sample.audio && sample.text.trim()) ? 3 : 2)
    : (samples.some((sample) => sample.audio) ? 2 : 1)

  const canCreate = voiceName.trim() &&
    samples.length > 0 &&
    samples.every((sample) => sample.audio && sample.text.trim()) &&
    stage === STAGE.IDLE

  const busy = stage === STAGE.CREATING
  const steps = [
    t('voiceClone.stepSamples'),
    t('voiceClone.stepName'),
    t('voiceClone.stepCreate')
  ]

  function updateSample(index, patch) {
    setSamples((prev) => prev.map((sample, itemIndex) => (
      itemIndex === index ? { ...sample, ...patch } : sample
    )))
  }

  function removeSample(index) {
    setSamples((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  function addSample() {
    if (samples.length >= MAX_SAMPLES) return
    setSamples((prev) => [...prev, makeSample()])
  }

  async function handleCreate() {
    if (!canCreate) return

    setStage(STAGE.CREATING)
    setErrorMsg('')

    try {
      const model = await createVoiceModel({
        title: voiceName.trim(),
        samples: samples.map(({ audio, text }) => ({ audio, text }))
      })

      setResult(model)
      setStage(STAGE.DONE)
      onSuccess?.()
    } catch (err) {
      setErrorMsg(err.message || t('voiceClone.createFailed'))
      setStage(STAGE.ERROR)
    }
  }

  function reset() {
    setSamples([makeSample()])
    setVoiceName('')
    setStage(STAGE.IDLE)
    setErrorMsg('')
    setResult(null)
  }

  return (
    <div className="vc-clone-flow">
      <div className="vc-steps">
        {steps.map((label, index) => (
          <div className="vc-step-wrap" key={label}>
            <div className={`vc-step ${step === index + 1 ? 'is-active' : step > index + 1 ? 'is-done' : ''}`}>
              <div className="vc-step-circle">
                {step > index + 1 ? '✓' : index + 1}
              </div>
              <span className="vc-step-label">{label}</span>
            </div>

            {index < 2 && <div className="vc-step-connector" />}
          </div>
        ))}
      </div>

      <div className="vc-info">
        <span className="vc-info-icon" aria-hidden="true">💡</span>
        <span>{t('voiceClone.sampleInfo', { maxSamples: MAX_SAMPLES })}</span>
      </div>

      <div>
        <p className="vc-section-title">{t('voiceClone.voiceSamples')}</p>

        <div className="vc-samples">
          {samples.map((sample, index) => (
            <SampleSlot
              key={index}
              index={index}
              sample={sample}
              onUpdate={(patch) => updateSample(index, patch)}
              onRemove={() => removeSample(index)}
              disabled={busy}
            />
          ))}
        </div>

        {samples.length < MAX_SAMPLES && (
          <button
            type="button"
            className="vc-add-sample"
            onClick={addSample}
            disabled={busy}
          >
            {t('voiceClone.addSample')}
          </button>
        )}
      </div>

      <div>
        <p className="vc-section-title">{t('voiceClone.voiceName')}</p>
        <input
          className="vc-name-input"
          type="text"
          placeholder={t('voiceClone.voiceNamePlaceholder')}
          value={voiceName}
          onChange={(event) => setVoiceName(event.target.value)}
          disabled={busy}
          maxLength={80}
        />
      </div>

      {stage === STAGE.ERROR && (
        <div className="vc-banner vc-banner--error">
          <span className="vc-banner-icon" aria-hidden="true">⚠</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {stage === STAGE.DONE && result && (
        <div className="vc-banner vc-banner--success">
          <span className="vc-banner-icon" aria-hidden="true">🎉</span>
          <span>
            <strong>"{result.title}"</strong> {t('voiceClone.trainingSuccess')}{' '}
            {t('voiceClone.trainingHint')}
          </span>
        </div>
      )}

      {stage !== STAGE.DONE ? (
        <button
          className="vc-create-btn"
          onClick={handleCreate}
          disabled={!canCreate || busy}
        >
          {busy ? (
            <><span className="vc-spinner" /> {t('voiceClone.trainingVoice')}</>
          ) : (
            <>✦ {t('voiceClone.cloneVoice')}</>
          )}
        </button>
      ) : (
        <button className="vc-reset-btn" onClick={reset}>
          ↺ {t('voiceClone.cloneAnother')}
        </button>
      )}
    </div>
  )
}
