/**
 * src/pages/VoiceClone.jsx
 *
 * AI Voice Cloning Studio — powered by Fish Audio S2-Pro
 *
 * Two tabs:
 *  1. Clone Voice  — record / upload samples → name the voice → create model
 *  2. My Voices    — list cloned models, preview TTS, delete
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  listVoiceModels,
  createVoiceModel,
  deleteVoiceModel,
  previewVoice,
  blobToBase64,
  convertToWav,
} from '../services/voiceCloneService.js'
import { startRecording } from '../services/asrService.js'
import './voice-clone.css'

// ── constants ──────────────────────────────────────────────────────────────
const MAX_SAMPLES      = 3
const DEFAULT_PREVIEW  = 'Hello! This is my cloned voice speaking. How does it sound?'

const STAGE = {
  IDLE:     'idle',
  CREATING: 'creating',
  DONE:     'done',
  ERROR:    'error',
}

// ── helpers ────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusClass(state) {
  if (state === 'trained')  return 'vc-voice-status--trained'
  if (state === 'training' || state === 'created') return 'vc-voice-status--training'
  return 'vc-voice-status--failed'
}

function statusLabel(state) {
  if (state === 'trained')  return '✓ Ready'
  if (state === 'training') return '⟳ Training'
  if (state === 'created')  return '⟳ Queued'
  return '✕ Failed'
}

// ── Waveform animation ────────────────────────────────────────────────────
function LiveWaveform() {
  return (
    <div className="vc-waveform" aria-hidden="true">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="vc-waveform-bar" />
      ))}
    </div>
  )
}

// ── Sample slot ────────────────────────────────────────────────────────────
function SampleSlot({ index, sample, onUpdate, onRemove, disabled }) {
  const fileRef    = useRef(null)
  const [recording, setRecording] = useState(false)
  const recHandle  = useRef(null)

  async function handleRecord() {
    if (recording && recHandle.current) {
      try {
        const { blob } = await recHandle.current.stop()
        recHandle.current = null
        setRecording(false)
        const wavBlob = await convertToWav(blob)
        const base64  = await blobToBase64(wavBlob)
        onUpdate({ audio: base64, mimeType: 'audio/wav', name: `recording-${index + 1}.wav` })
      } catch (err) {
        setRecording(false)
        alert(err.message || 'Recording error')
      }
      return
    }
    try {
      setRecording(true)
      const handle = await startRecording()
      recHandle.current = handle
    } catch (err) {
      setRecording(false)
      alert(err.message || 'Microphone unavailable')
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    let blob = file
    let name = file.name
    // Convert to WAV for best Fish compatibility
    try {
      blob = await convertToWav(file)
      name = file.name.replace(/\.[^.]+$/, '.wav')
    } catch {
      // fall through with original
    }
    const base64 = await blobToBase64(blob)
    onUpdate({ audio: base64, mimeType: 'audio/wav', name })
  }

  const hasAudio = Boolean(sample?.audio)

  return (
    <div className={`vc-sample-slot ${hasAudio ? 'has-audio' : ''}`}>
      <div className="vc-sample-header">
        <span className="vc-sample-number">Sample {index + 1}</span>
        <div className="vc-sample-actions">
          <button
            type="button"
            className={`vc-record-btn ${recording ? 'vc-record-btn--recording' : ''}`}
            onClick={handleRecord}
            disabled={disabled}
          >
            <span className="vc-record-dot" />
            {recording ? 'Stop' : 'Record'}
          </button>

          <button
            type="button"
            className="vc-upload-btn"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || recording}
          >
            ↑ Upload
          </button>

          {index > 0 && (
            <button
              type="button"
              className="vc-delete-btn"
              onClick={onRemove}
              disabled={disabled}
              title="Remove sample"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {recording && <LiveWaveform />}

      {hasAudio && !recording && (
        <div className="vc-sample-ready">
          <span className="vc-sample-ready-icon">✓</span>
          {sample.name || 'Audio ready'}
        </div>
      )}

      <textarea
        className="vc-transcript"
        rows={2}
        placeholder="Enter the exact transcript of this audio clip…"
        value={sample?.text || ''}
        onChange={(e) => onUpdate({ text: e.target.value })}
        disabled={disabled}
      />
    </div>
  )
}

// ── My Voices tab ─────────────────────────────────────────────────────────
function VoiceCard({ model, onDeleted }) {
  const [previewText, setPreviewText]     = useState(DEFAULT_PREVIEW)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewUrl, setPreviewUrl]       = useState(null)
  const [previewError, setPreviewError]   = useState('')
  const [deleting, setDeleting]           = useState(false)
  const audioRef = useRef(null)
  const prevUrlRef = useRef(null)

  function releasePrev() {
    if (prevUrlRef.current) { URL.revokeObjectURL(prevUrlRef.current); prevUrlRef.current = null }
  }

  useEffect(() => () => releasePrev(), [])

  async function handlePreview() {
    if (!previewText.trim() || model.state !== 'trained') return
    setPreviewLoading(true)
    setPreviewError('')
    releasePrev()
    try {
      const url = await previewVoice(model._id, previewText.trim())
      prevUrlRef.current = url
      setPreviewUrl(url)
      setTimeout(() => audioRef.current?.play().catch(() => {}), 50)
    } catch (err) {
      setPreviewError(err.message || 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete voice "${model.title}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteVoiceModel(model._id)
      onDeleted(model._id)
    } catch (err) {
      alert(err.message || 'Delete failed')
      setDeleting(false)
    }
  }

  const canPreview = model.state === 'trained'

  return (
    <div className="vc-voice-card">
      <div className="vc-voice-card-header">
        <div>
          <div className="vc-voice-name">{model.title || 'Untitled Voice'}</div>
          <div className="vc-voice-meta">Created {formatDate(model.created_at)}</div>
        </div>
        <span className={`vc-voice-status ${statusClass(model.state)}`}>
          {statusLabel(model.state)}
        </span>
      </div>

      {canPreview ? (
        <div className="vc-preview-area">
          <textarea
            className="vc-preview-input"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Type something to preview…"
            rows={2}
          />
          <div className="vc-preview-actions">
            <button
              className="vc-preview-btn"
              onClick={handlePreview}
              disabled={previewLoading || !previewText.trim()}
            >
              {previewLoading ? <span className="vc-spinner" /> : '▶'}
              {previewLoading ? ' Generating…' : ' Preview'}
            </button>
            <button className="vc-delete-btn" onClick={handleDelete} disabled={deleting}>
              {deleting ? <span className="vc-spinner" /> : '✕'} Delete
            </button>
          </div>

          {previewError && (
            <div className="vc-banner vc-banner--error">
              <span className="vc-banner-icon">⚠</span>{previewError}
            </div>
          )}

          {previewUrl && (
            <audio ref={audioRef} src={previewUrl} controls className="vc-audio-player" />
          )}
        </div>
      ) : (
        <div className="vc-preview-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="vc-delete-btn" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="vc-spinner" /> : '✕'} Delete
          </button>
        </div>
      )}
    </div>
  )
}

function MyVoicesTab() {
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
function makeSample() { return { audio: '', mimeType: '', name: '', text: '' } }

function CloneTab({ onSuccess }) {
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
const TAB = { CLONE: 'clone', VOICES: 'voices' }

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
        <Link to="/dashboard" className="vc-back">← Back</Link>
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