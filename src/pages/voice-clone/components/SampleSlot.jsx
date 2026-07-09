import { useRef, useState } from 'react'

import { useTranslation } from '../../../i18n/useTranslation.js'
import { startRecording } from '../../../services/asrService.js'
import { blobToBase64, convertToWav } from '../../../services/voiceCloneService.js'
import LiveWaveform from './LiveWaveform.jsx'

export default function SampleSlot({ index, sample, onUpdate, onRemove, disabled }) {
  const { t } = useTranslation()
  const fileRef = useRef(null)
  const recHandle = useRef(null)
  const [recording, setRecording] = useState(false)

  async function handleRecord() {
    if (recording && recHandle.current) {
      try {
        const { blob } = await recHandle.current.stop()
        recHandle.current = null
        setRecording(false)

        const wavBlob = await convertToWav(blob)
        const base64 = await blobToBase64(wavBlob)

        onUpdate({
          audio: base64,
          mimeType: 'audio/wav',
          name: `recording-${index + 1}.wav`
        })
      } catch (err) {
        setRecording(false)
        alert(err.message || t('voiceClone.recordingError'))
      }

      return
    }

    try {
      setRecording(true)
      const handle = await startRecording()
      recHandle.current = handle
    } catch (err) {
      setRecording(false)
      alert(err.message || t('voiceClone.microphoneUnavailable'))
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    event.target.value = ''

    let blob = file
    let name = file.name

    try {
      blob = await convertToWav(file)
      name = file.name.replace(/\.[^.]+$/, '.wav')
    } catch {
      // Keep original audio if browser conversion fails.
    }

    const base64 = await blobToBase64(blob)
    onUpdate({ audio: base64, mimeType: 'audio/wav', name })
  }

  const hasAudio = Boolean(sample?.audio)

  return (
    <div className={`vc-sample-slot ${hasAudio ? 'has-audio' : ''}`}>
      <div className="vc-sample-header">
        <span className="vc-sample-number">
          {t('voiceClone.sample', { number: index + 1 })}
        </span>

        <div className="vc-sample-actions">
          <button
            type="button"
            className={`vc-record-btn ${recording ? 'vc-record-btn--recording' : ''}`}
            onClick={handleRecord}
            disabled={disabled}
          >
            <span className="vc-record-dot" />
            {recording ? t('voiceClone.stop') : t('voiceClone.record')}
          </button>

          <button
            type="button"
            className="vc-upload-btn"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || recording}
          >
            <span aria-hidden="true">&uarr;</span> {t('voiceClone.upload')}
          </button>

          {index > 0 && (
            <button
              type="button"
              className="vc-delete-btn"
              onClick={onRemove}
              disabled={disabled}
              title={t('voiceClone.removeSample')}
            >
              <span aria-hidden="true">&times;</span>
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
          <span className="vc-sample-ready-icon" aria-hidden="true">✓</span>
          {sample.name || t('voiceClone.audioReady')}
        </div>
      )}

      <textarea
        className="vc-transcript"
        rows={2}
        placeholder={t('voiceClone.transcriptPlaceholder')}
        value={sample?.text || ''}
        onChange={(event) => onUpdate({ text: event.target.value })}
        disabled={disabled}
      />
    </div>
  )
}
