import { useEffect, useRef, useState } from 'react'
import { synthesizeSpeech } from '../../services/ttsService.js'

const MAX_CACHE = 8

function MessageBubble({
  message,
  onPlayRetry,
  onPauseResume,
  loadingMessageId,
  activeMessageId,
  isPaused,
  playbackModeForMessage
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="chat-bubble chat-bubble-user">
          <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{message.content}</p>
        </div>
      </div>
    )
  }

  const isLoading = loadingMessageId === message.id
  const isActive = activeMessageId === message.id
  const canResume = playbackModeForMessage === 'audio' // only real audio can reliably resume

  return (
    <div className="flex justify-start items-start gap-2">
      <img
        className="mt-0.5 h-7 w-7 rounded-full object-cover border border-white/30 shrink-0"
        src="/teto-teach-profile.jpeg"
        alt="Teto"
      />

      <div className="chat-bubble chat-bubble-assistant">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="inline-block text-xs font-semibold text-text-secondary">Teto</span>

          <div className="flex items-center gap-1">
            {/* ▶ always regenerate/retry API, fallback if needed */}
            <button
              onClick={() => onPlayRetry(message)}
              disabled={isLoading}
              className="chat-voice-btn chat-voice-btn-play"
              title="Generate / Retry audio"
            >
              {isLoading ? '...' : '▶'}
            </button>

            <button
              onClick={() => onPauseResume(message)}
              disabled={!isActive || (isPaused && !canResume)}
              className="chat-voice-btn chat-voice-btn-pause"
              title={
                canResume
                  ? (isPaused ? 'Resume' : 'Pause')
                  : 'Fallback mode: pause = stop, no resume'
              }
            >
              {isPaused ? '⏵' : '⏸'}
            </button>
          </div>
        </div>

        <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{message.content}</p>
      </div>
    </div>
  )
}

export default function ChatMain({
  title,
  messages,
  input,
  onInputChange,
  onSend,
  busy,
  error,
  disabled,
  onOpenLeftDrawer,
  onOpenRightDrawer
}) {
  const listRef = useRef(null)

  const audioRef = useRef(null)
  const playbackRef = useRef({
    mode: null, // 'audio' | 'synth' | null
    messageId: null,
    paused: false
  })

  const cacheOrderRef = useRef([])

  const [audioUrlByMessageId, setAudioUrlByMessageId] = useState({})
  const [loadingMessageId, setLoadingMessageId] = useState(null)
  const [activeMessageId, setActiveMessageId] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const [playbackMode, setPlaybackMode] = useState(null)
  const [speechWarning, setSpeechWarning] = useState(null)

  useEffect(() => {
    const node = listRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, busy, error])

  useEffect(() => {
    return () => {
      stopAllPlayback()
      Object.values(audioUrlByMessageId).forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateUiFromPlayback() {
    setActiveMessageId(playbackRef.current.messageId)
    setIsPaused(playbackRef.current.paused)
    setPlaybackMode(playbackRef.current.mode)
  }

  function clearPlaybackState() {
    playbackRef.current = { mode: null, messageId: null, paused: false }
    updateUiFromPlayback()
  }

  function stopAllPlayback() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (window?.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    clearPlaybackState()
  }

  function pickFemaleVoice(voices) {
    const preferred = [
      /female/i,
      /woman/i,
      /girl/i,
      /zira/i,
      /samantha/i,
      /victoria/i,
      /karen/i,
      /moira/i,
      /google us english female/i
    ]
    for (const p of preferred) {
      const found = voices.find((v) => p.test(v.name))
      if (found) return found
    }
    return voices[0] || null
  }

  function addToCache(messageId, url) {
    setAudioUrlByMessageId((prev) => ({ ...prev, [messageId]: url }))

    const next = [...cacheOrderRef.current.filter((id) => id !== messageId), messageId]
    cacheOrderRef.current = next

    if (next.length > MAX_CACHE) {
      const evictId = next[0]
      cacheOrderRef.current = next.slice(1)
      setAudioUrlByMessageId((prev) => {
        const old = prev[evictId]
        if (old) URL.revokeObjectURL(old)
        const { [evictId]: _removed, ...rest } = prev
        return rest
      })
    }
  }

  function removeFromCache(messageId) {
    setAudioUrlByMessageId((prev) => {
      const old = prev[messageId]
      if (old) URL.revokeObjectURL(old)
      const { [messageId]: _removed, ...rest } = prev
      return rest
    })
    cacheOrderRef.current = cacheOrderRef.current.filter((id) => id !== messageId)
  }

  function playWithSynth(messageId, text) {
    if (!window?.speechSynthesis || !text?.trim()) return false

    const synth = window.speechSynthesis
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickFemaleVoice(synth.getVoices())
    if (voice) utterance.voice = voice

    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => {
      playbackRef.current = { mode: 'synth', messageId, paused: false }
      updateUiFromPlayback()
    }

    utterance.onend = () => clearPlaybackState()
    utterance.onerror = () => clearPlaybackState()

    synth.speak(utterance)
    return true
  }

  async function playWithAudioUrl(messageId, url, fallbackText) {
    const audio = new Audio(url)
    audioRef.current = audio

    audio.onplay = () => {
      playbackRef.current = { mode: 'audio', messageId, paused: false }
      updateUiFromPlayback()
    }

    audio.onpause = () => {
      if (!audio.ended && playbackRef.current.messageId === messageId) {
        playbackRef.current.paused = true
        updateUiFromPlayback()
      }
    }

    audio.onended = () => clearPlaybackState()

    audio.onerror = () => {
      // fallback to synth if html audio fails
      const ok = playWithSynth(messageId, fallbackText)
      if (!ok) clearPlaybackState()
    }

    await audio.play()
  }

  // ▶ button behavior: always retry API first
  async function handlePlayRetry(message) {
    if (!message?.id || !message?.content?.trim()) return

    setSpeechWarning(null)
    setLoadingMessageId(message.id)

    // stop current playback and fresh retry for this bubble
    stopAllPlayback()
    removeFromCache(message.id)

    try {
      const result = await synthesizeSpeech(message.content)

      if (result.mode === 'audio' && result.url) {
        addToCache(message.id, result.url)
        await playWithAudioUrl(message.id, result.url, message.content)
      } else {
        setSpeechWarning(result.error || 'Using browser TTS fallback')
        const ok = playWithSynth(message.id, message.content)
        if (!ok) throw new Error('No browser speech available')
      }
    } catch (err) {
      console.error(err)
      const ok = playWithSynth(message.id, message.content)
      if (!ok) clearPlaybackState()
    } finally {
      setLoadingMessageId(null)
    }
  }

  // ⏸ / ⏵ behavior
  async function handlePauseResume(message) {
    if (!message?.id) return

    const { mode, messageId, paused } = playbackRef.current
    if (messageId !== message.id) return

    // reliable pause/resume
    if (mode === 'audio' && audioRef.current) {
      if (paused || audioRef.current.paused) {
        try {
          await audioRef.current.play()
          playbackRef.current.paused = false
          updateUiFromPlayback()
        } catch (e) {
          console.error(e)
        }
      } else {
        audioRef.current.pause()
        playbackRef.current.paused = true
        updateUiFromPlayback()
      }
      return
    }

    // synth fallback: pause acts as stop; no reliable resume
    if (mode === 'synth' && window?.speechSynthesis) {
      window.speechSynthesis.cancel()
      clearPlaybackState()
      setSpeechWarning('Fallback voice does not support reliable resume. Press ▶ to replay.')
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-bg-main overflow-hidden">
      <header className="shrink-0 flex justify-center border-b border-white/10 px-4 py-3">
        <button className="chat-icon-btn md:hidden" onClick={onOpenLeftDrawer}>
          ☰
        </button>

        <div className="flex flex-col items-center gap-2 mx-4 text-center">
          <img
            className="w-11 h-11 object-cover rounded-full border-1 border-white/80"
            src="/teto-teach-profile.jpeg"
            alt="Teto Profile Image"
          />
          <div className="flex items-center gap-2 justify-center">
            <h2 className="text-base font-semibold !text-white">{title || 'New chat'}</h2>
          </div>
          <p className="chat-subtle text-xs">Teto will help you with your studies</p>
        </div>

        <button className="chat-icon-btn lg:hidden" onClick={onOpenRightDrawer}>
          ⚙
        </button>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="chat-subtle">Start the conversation — previous messages will be reused as memory.</p>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={message.id || `${message.role}-${message.created_at || 'temp'}-${index}`}
            message={message}
            onPlayRetry={handlePlayRetry}
            onPauseResume={handlePauseResume}
            loadingMessageId={loadingMessageId}
            activeMessageId={activeMessageId}
            isPaused={activeMessageId === message.id ? isPaused : false}
            playbackModeForMessage={activeMessageId === message.id ? playbackMode : null}
          />
        ))}

        {busy && <p className="chat-subtle">Teto is thinking...</p>}
      </div>

      {speechWarning && (
        <div className="shrink-0 px-4 pb-2 text-xs text-amber-300">🔈 {speechWarning}</div>
      )}

      {error && <div className="shrink-0 px-4 pb-2 text-sm text-red-300">⚠ {error}</div>}

      <footer className="shrink-0 border-t border-white/10 bg-bg-panel2 p-4">
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSend()
              }
            }}
            className="chat-input flex-1"
            placeholder={disabled ? 'Sign in to send messages' : 'Ask Teto anything...'}
            disabled={disabled || busy}
          />
          <button className="chat-btn" onClick={onSend} disabled={disabled || busy || !input.trim()}>
            Send
          </button>
        </div>
      </footer>
    </section>
  )
}