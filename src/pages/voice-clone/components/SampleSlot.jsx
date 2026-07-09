import { useRef, useState } from 'react'
import { startRecording } from '../../../services/asrService.js'
import { blobToBase64, convertToWav } from '../../../services/voiceCloneService.js'
import LiveWaveform from './LiveWaveform.jsx'

export default function SampleSlot({ index, sample, onUpdate, onRemove, disabled }) {
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
