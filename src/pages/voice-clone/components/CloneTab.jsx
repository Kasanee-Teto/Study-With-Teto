import { useState } from 'react'
import { createVoiceModel } from '../../../services/voiceCloneService.js'
import { MAX_SAMPLES, STAGE } from '../constants.js'
import SampleSlot from './SampleSlot.jsx'

function makeSample() { return { audio: '', mimeType: '', name: '', text: '' } }

export default function CloneTab({ onSuccess }) {
  const [samples, setSamples]   = useState([makeSample()])
  const [voiceName, setVoiceName] = useState('')
  const [stage,   setStage]     = useState(STAGE.IDLE)
  const [errorMsg, setErrorMsg] = useState('')
  const [result,  setResult]    = useState(null)

  const step = voiceName.trim()
    ? (samples.every((s) => s.audio && s.text.trim()) ? 3 : 2)
    : (samples.some((s) => s.audio) ? 2 : 1)

  const canCreate = voiceName.trim() &&
    samples.length > 0 &&
    samples.every((s) => s.audio && s.text.trim()) &&
    stage === STAGE.IDLE

  function updateSample(idx, patch) {
    setSamples((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  function removeSample(idx) {
    setSamples((prev) => prev.filter((_, i) => i !== idx))
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
        samples: samples.map(({ audio, text }) => ({ audio, text })),
      })
      setResult(model)
      setStage(STAGE.DONE)
      onSuccess?.()
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create voice model')
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

  const busy = stage === STAGE.CREATING

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Step indicator */}
      <div className="vc-steps">
        {['Samples', 'Name', 'Create'].map((label, i) => (
          <>
            <div className={`vc-step ${step === i + 1 ? 'is-active' : step > i + 1 ? 'is-done' : ''}`} key={label}>
              <div className="vc-step-circle">{step > i + 1 ? '✓' : i + 1}</div>
              <span className="vc-step-label">{label}</span>
            </div>
            {i < 2 && <div className="vc-step-connector" key={`c-${i}`} />}
          </>
        ))}
      </div>

      {/* Info banner */}
      <div className="vc-info">
        <span className="vc-info-icon">💡</span>
        <span>
          Record or upload <strong>10–30 seconds</strong> of clear speech per sample.
          Add a word-for-word transcript for each clip. Up to {MAX_SAMPLES} samples for best results.
        </span>
      </div>

      {/* Samples */}
      <div>
        <p className="vc-section-title">Voice Samples</p>
        <div className="vc-samples">
          {samples.map((s, i) => (
            <SampleSlot
              key={i}
              index={i}
              sample={s}
              onUpdate={(patch) => updateSample(i, patch)}
              onRemove={() => removeSample(i)}
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
            style={{ marginTop: 12 }}
          >
            + Add another sample
          </button>
        )}
      </div>

      {/* Voice name */}
      <div>
        <p className="vc-section-title">Voice Name</p>
        <input
          className="vc-name-input"
          type="text"
          placeholder="e.g. Teto Study Voice, My Reading Voice…"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          disabled={busy}
          maxLength={80}
        />
      </div>

      {/* Banners */}
      {stage === STAGE.ERROR && (
        <div className="vc-banner vc-banner--error">
          <span className="vc-banner-icon">⚠</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {stage === STAGE.DONE && result && (
        <div className="vc-banner vc-banner--success">
          <span className="vc-banner-icon">🎉</span>
          <span>
            <strong>"{result.title}"</strong> is being trained!&nbsp;
            Once ready (usually under a minute), you can preview it in <strong>My Voices</strong>.
          </span>
        </div>
      )}

      {/* Action */}
      {stage !== STAGE.DONE ? (
        <button
          className="vc-create-btn"
          onClick={handleCreate}
          disabled={!canCreate || busy}
        >
          {busy ? (
            <><span className="vc-spinner" /> Training voice…</>
          ) : (
            '✦ Clone Voice'
          )}
        </button>
      ) : (
        <button className="vc-reset-btn" onClick={reset}>
          ↺ Clone another voice
        </button>
      )}
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────
