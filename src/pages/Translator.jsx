/**
 * src/pages/Translator.jsx
 *
 * Speech-to-speech translation page: Indonesian → English
 * Pipeline: Record → ASR (Fish) → LibreTranslate → TTS (Fish) → Play
 */

import { useState, useRef } from 'react'
import { Link }                           from 'react-router-dom'
import { useTranslation } from '../i18n/useTranslation.js'
import { startRecording, transcribeAudio } from '../services/asrService.js'
import { translateIdToEn }                 from '../services/translateService.js'
import { synthesizeSpeech }                from '../services/ttsService.js'
import './translator.css'

// ---------------------------------------------------------------------------
// Step constants
// ---------------------------------------------------------------------------
const STEP = {
  IDLE:         'idle',
  RECORDING:    'recording',
  TRANSCRIBING: 'transcribing',
  TRANSLATING:  'translating',
  SYNTHESISING: 'synthesising',
  DONE:         'done',
  ERROR:        'error',
}

const STEP_LABEL_KEYS = {
  [STEP.IDLE]:         'translator.ready',
  [STEP.RECORDING]:    'translator.recording',
  [STEP.TRANSCRIBING]: 'translator.transcribing',
  [STEP.TRANSLATING]:  'translator.translating',
  [STEP.SYNTHESISING]: 'translator.synthesising',
  [STEP.DONE]:         'translator.done',
  [STEP.ERROR]:        'translator.error',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Translator() {
  const { t } = useTranslation()
  const [step,        setStep]        = useState(STEP.IDLE)
  const [transcript,  setTranscript]  = useState('')   // ID text
  const [translation, setTranslation] = useState('')   // EN text
  const [errorMsg,    setErrorMsg]    = useState('')
  const [audioUrl,    setAudioUrl]    = useState(null)

  const recorderRef  = useRef(null)
  const audioRef     = useRef(null)
  const prevUrlRef   = useRef(null)

  // Clean up previous audio URL
  function releasePrevUrl() {
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current)
      prevUrlRef.current = null
    }
  }

  // -------------------------------------------------------------------------
  // Main pipeline
  // -------------------------------------------------------------------------
  async function handleRecord() {
    // If already recording → stop
    if (step === STEP.RECORDING && recorderRef.current) {
      try {
        const { blob, mimeType } = await recorderRef.current.stop()
        recorderRef.current = null
        await runPipeline(blob, mimeType)
      } catch (err) {
        setErrorMsg(err.message || t('translator.stopRecordingError'))
        setStep(STEP.ERROR)
      }
      return
    }

    // Start recording
    setStep(STEP.RECORDING)
    setTranscript('')
    setTranslation('')
    setErrorMsg('')
    setAudioUrl(null)
    releasePrevUrl()

    try {
      const handle = await startRecording()
      recorderRef.current = handle
    } catch (err) {
      setErrorMsg(err.message || t('translator.microphoneUnavailable'))
      setStep(STEP.ERROR)
    }
  }

  async function runPipeline(blob, mimeType) {
    try {
      // 1. ASR
      setStep(STEP.TRANSCRIBING)
      const { text: idText } = await transcribeAudio(blob, mimeType)
      if (!idText.trim()) throw new Error(t('translator.noSpeech'))
      setTranscript(idText)

      // 2. Translate
      setStep(STEP.TRANSLATING)
      const { translatedText: enText } = await translateIdToEn(idText)
      if (!enText.trim()) throw new Error(t('translator.emptyTranslation'))
      setTranslation(enText)

      // 3. TTS
      setStep(STEP.SYNTHESISING)
      const result = await synthesizeSpeech(enText)
      if (result.mode !== 'audio' || !result.url) {
        throw new Error(result.error || t('translator.ttsFailed'))
      }
      prevUrlRef.current = result.url
      setAudioUrl(result.url)

      // 4. Auto-play
      if (audioRef.current) {
        audioRef.current.src = result.url
        audioRef.current.play().catch(() => {/* user gesture required in some browsers */})
      }

      setStep(STEP.DONE)
    } catch (err) {
      console.error('[translator]', err)
      setErrorMsg(err.message || t('translator.pipelineFailed'))
      setStep(STEP.ERROR)
    }
  }

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------
  function reset() {
    if (recorderRef.current) {
      recorderRef.current.stop().catch(() => {})
      recorderRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    releasePrevUrl()
    setStep(STEP.IDLE)
    setTranscript('')
    setTranslation('')
    setErrorMsg('')
    setAudioUrl(null)
  }

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------
  const isRecording = step === STEP.RECORDING
  const isBusy      = [STEP.TRANSCRIBING, STEP.TRANSLATING, STEP.SYNTHESISING].includes(step)
  const isDone      = step === STEP.DONE
  const isError     = step === STEP.ERROR
  const stepLabel   = t(STEP_LABEL_KEYS[step])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="translator-page">
      {/* Hidden audio element for auto-play */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* ── Header ── */}
      <header className="translator-header">
        <Link to="/dashboard" className="translator-back">{t('translator.back')}</Link>
        <div className="translator-title-group">
          <h1 className="translator-title">
            <span className="translator-title-id">ID</span>
            <span className="translator-arrow">→</span>
            <span className="translator-title-en">EN</span>
          </h1>
          <p className="translator-subtitle">{t('translator.subtitle')}</p>
        </div>
        <div style={{ width: 72 }} /* add spacer for centering */ />
      </header>

      {/* ── Main card ── */}
      <main className="translator-main">

        {/* ── Microphone button ── */}
        <div className="mic-zone">
          <button
            className={`mic-btn ${isRecording ? 'mic-btn--recording' : ''} ${isBusy ? 'mic-btn--busy' : ''}`}
            onClick={handleRecord}
            disabled={isBusy}
            aria-label={isRecording ? t('translator.stopRecording') : t('translator.startRecording')}
          >
            {isBusy ? (
              <Spinner />
            ) : isRecording ? (
              <StopIcon />
            ) : (
              <MicIcon />
            )}
            {isRecording && <span className="mic-pulse" aria-hidden="true" />}
          </button>

          <p className="mic-status">
            {stepLabel}
          </p>
        </div>

        {/* ── Error banner ── */}
        {isError && (
          <div className="translator-error" role="alert">
            <span className="translator-error-icon">⚠</span>
            {errorMsg}
          </div>
        )}

        {/* ── Result panels ── */}
        {(transcript || translation) && (
          <div className="result-grid">

            {/* Indonesian transcript */}
            <section className="result-panel result-panel--id">
              <header className="result-panel-header">
                <span className="result-lang-badge result-lang-badge--id">ID</span>
                <span className="result-panel-label">{t('translator.transcript')}</span>
              </header>
              <p className="result-text">
                {transcript || <span className="result-placeholder">{t('translator.transcribingPlaceholder')}</span>}
              </p>
            </section>

            {/* English translation */}
            <section className="result-panel result-panel--en">
              <header className="result-panel-header">
                <span className="result-lang-badge result-lang-badge--en">EN</span>
                <span className="result-panel-label">{t('translator.translation')}</span>
              </header>
              <p className="result-text">
                {translation || <span className="result-placeholder">{t('translator.translatingPlaceholder')}</span>}
              </p>
            </section>
          </div>
        )}

        {/* ── Audio controls (shown once TTS is ready) ── */}
        {isDone && audioUrl && (
          <div className="audio-controls">
            <button
              className="audio-play-btn"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0
                  audioRef.current.play()
                }
              }}
            >
              {t('translator.playAgain')}
            </button>

            <a
              className="audio-download-btn"
              href={audioUrl}
              download="translation.mp3"
            >
              {t('translator.downloadMp3')}
            </a>
          </div>
        )}

        {/* ── Reset button ── */}
        {(isDone || isError || transcript) && (
          <button className="translator-reset-btn" onClick={reset}>
            {t('translator.translateAgain')}
          </button>
        )}

        {/* ── Tip ── */}
        {step === STEP.IDLE && (
          <p className="translator-tip">
            {t('translator.tip')}
          </p>
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Icon sub-components
// ---------------------------------------------------------------------------

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="13" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8"  y1="23" x2="16" y2="23"/>
    </svg>
  )
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3"/>
    </svg>
  )
}

function Spinner() {
  return <span className="translator-spinner" aria-hidden="true" />
}