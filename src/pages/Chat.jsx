import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getOrCreateAppUser } from '../services/userService'
import {
  createSession,
  listMessages,
  listSessions,
  sendMessage
} from '../services/chatService'
import LeftSidebar from './chat/LeftSidebar'
import ChatMain from './chat/ChatMain'
import RightPanel from './chat/RightPanel'
import MobileDrawers from './chat/MobileDrawers'

const LAST_SESSION_STORAGE_KEY = 'chat:lastSessionId'

/**
 * How to extend:
 * - Add right-panel setting: extend RightPanel and include value in sendMessage payload.
 * - Change theme tokens: update @theme colors in src/index.css.
 * - Add message pagination: update listMessages(sessionId, limit) and load more on scroll.
 * - Add streaming responses: replace aiService.generateReply with stream API and append chunks.
 */
export default function Chat() {
  const [appUser, setAppUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [messagesBySessionId, setMessagesBySessionId] = useState({})
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const currentMessages = useMemo(
    () => messagesBySessionId[currentSessionId] || [],
    [messagesBySessionId, currentSessionId]
  )
  const activeSession = sessions.find((session) => session.id === currentSessionId) || null

  useEffect(() => {
    async function bootstrap() {
      try {
        const { data, error: supabaseError } = await supabase.auth.getUser()
        if (supabaseError || !data?.user) {
          throw new Error('You are signed out. Please sign in to use chat.')
        }
        const user = await getOrCreateAppUser()
        setAppUser(user)
      } catch (bootstrapError) {
        console.error(bootstrapError)
        setAuthError(bootstrapError.message || 'Failed to initialize chat')
      } finally {
        setAuthReady(true)
      }
    }

    bootstrap()
  }, [])

  const refreshSessions = useCallback(async (preferredId) => {
    setSessionsLoading(true)
    try {
      const nextSessions = await listSessions()
      setSessions(nextSessions)

      if (nextSessions.length === 0) {
        const session = await createSession('New chat')
        setSessions([session])
        setCurrentSessionId(session.id)
        localStorage.setItem(LAST_SESSION_STORAGE_KEY, session.id)
        return
      }

      const savedSessionId = localStorage.getItem(LAST_SESSION_STORAGE_KEY)
      const targetId = preferredId || savedSessionId || nextSessions[0]?.id

      const stillExists = nextSessions.some((item) => item.id === targetId)
      const resolvedSessionId = stillExists ? targetId : nextSessions[0]?.id
      setCurrentSessionId(resolvedSessionId)
      localStorage.setItem(LAST_SESSION_STORAGE_KEY, resolvedSessionId)
    } catch (loadError) {
      console.error(loadError)
      setError(loadError.message || 'Failed to load sessions')
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authReady || authError) return
    refreshSessions().catch((refreshError) => {
      console.error(refreshError)
      setError(refreshError.message || 'Failed to load sessions')
    })
  }, [authReady, authError, refreshSessions])

  useEffect(() => {
    if (!currentSessionId) return
    if (messagesBySessionId[currentSessionId]) return

    async function loadSessionMessages() {
      setMessagesLoading(true)
      try {
        const messages = await listMessages(currentSessionId)
        setMessagesBySessionId((prev) => ({ ...prev, [currentSessionId]: messages }))
        localStorage.setItem(LAST_SESSION_STORAGE_KEY, currentSessionId)
      } catch (loadError) {
        console.error(loadError)
        setError(loadError.message || 'Failed to load messages')
      } finally {
        setMessagesLoading(false)
      }
    }

    loadSessionMessages()
  }, [currentSessionId, messagesBySessionId])

  async function handleCreateSession() {
    setError(null)
    try {
      const session = await createSession('New chat')
      setSessions((prev) => [session, ...prev])
      setCurrentSessionId(session.id)
      setMessagesBySessionId((prev) => ({ ...prev, [session.id]: [] }))
      localStorage.setItem(LAST_SESSION_STORAGE_KEY, session.id)
      setLeftOpen(false)
    } catch (createError) {
      console.error(createError)
      setError(createError.message || 'Failed to create chat session')
    }
  }

  function handleSpeak(text) {
    if (!text.trim() || !window.speechSynthesis) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // Get available voices and select a female voice
    const voices = window.speechSynthesis.getVoices()
    const femaleVoice =
      voices.find((voice) =>
        voice.name.includes('Female') ||
        voice.name.includes('female') ||
        voice.name.includes('Woman') ||
        voice.name.includes('woman') ||
        voice.name.includes('Google US English Female')
      ) || voices.find((voice) => voice.name.includes('Google'))

    if (femaleVoice) {
      utterance.voice = femaleVoice
    }

    utterance.volume = 1
    utterance.rate = 1
    utterance.pitch = 1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  async function handleSend() {
    if (!currentSessionId || busy || !input.trim() || authError) return
    const messageText = input.trim()
    setInput('')
    setError(null)
    setBusy(true)

    const tempUserMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString()
    }

    setMessagesBySessionId((prev) => ({
      ...prev,
      [currentSessionId]: [...(prev[currentSessionId] || []), tempUserMessage]
    }))

    try {
      const { userMessage, assistantMessage } = await sendMessage(
        currentSessionId,
        messageText,
        currentMessages
      )

      setMessagesBySessionId((prev) => {
        const withoutTemp = (prev[currentSessionId] || []).filter((item) => item.id !== tempUserMessage.id)
        return {
          ...prev,
          [currentSessionId]: [...withoutTemp, userMessage, assistantMessage]
        }
      })
    } catch (sendErr) {
      console.error(sendErr)
      setMessagesBySessionId((prev) => {
        const withoutTemp = (prev[currentSessionId] || []).filter((item) => item.id !== tempUserMessage.id)
        return {
          ...prev,
          [currentSessionId]: sendErr.userMessage
            ? [...withoutTemp, sendErr.userMessage]
            : withoutTemp
        }
      })
      setError(sendErr.message || 'Failed to generate assistant response')
    } finally {
      setBusy(false)
    }
  }

  const leftSidebar = (
    <LeftSidebar
      sessions={sessions}
      activeSessionId={currentSessionId}
      search={search}
      setSearch={setSearch}
      onCreateSession={handleCreateSession}
      onSelectSession={(id) => {
        setCurrentSessionId(id)
        localStorage.setItem(LAST_SESSION_STORAGE_KEY, id)
        setLeftOpen(false)
      }}
      profileName={appUser?.display_name || appUser?.email || 'Unknown user'}
      loading={sessionsLoading}
    />
  )

  const rightPanel = (
    <RightPanel
      activeSession={activeSession}
      messageCount={currentMessages.length}
    />
  )

  const blocked = !!authError || !currentSessionId
  const title = activeSession?.title || 'New chat'
  const renderMessages = useMemo(
    () => (messagesLoading && currentMessages.length === 0 ? [] : currentMessages),
    [messagesLoading, currentMessages]
  )

  return (
    <div
      className="h-[100dvh] overflow-hidden"
      style={{ background: 'var(--teto-page-bg)', color: 'var(--teto-text)' }}
    >
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <div className="hidden md:block min-h-0 overflow-hidden">{leftSidebar}</div>

        <div className="min-h-0 overflow-hidden">
          <ChatMain
            title={title}
            messages={renderMessages}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            busy={busy || messagesLoading}
            error={authError || error}
            disabled={blocked}
            onOpenLeftDrawer={() => setLeftOpen(true)}
            onOpenRightDrawer={() => setRightOpen(true)}
            onSpeak={handleSpeak}
            isSpeaking={isSpeaking}
          />
        </div>

        <div className="hidden lg:block min-h-0 overflow-hidden">{rightPanel}</div>
      </div>

      <MobileDrawers
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        closeLeft={() => setLeftOpen(false)}
        closeRight={() => setRightOpen(false)}
        leftContent={leftSidebar}
        rightContent={rightPanel}
      />
    </div>
  )
}