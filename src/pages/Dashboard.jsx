import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useEffect, useMemo, useState } from 'react'
import './dashboard.css'
import { useTranslation } from '../i18n/config.jsx'

import feedbackIcon from '../assets/feedback.png'
import settingsIcon from '../assets/settings.png'
import logoutIcon from '../assets/logout.png'

export default function Dashboard() {
  const { t, language } = useTranslation()
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const [now, setNow] = useState(new Date())

  const [todos, setTodos] = useState([
    { id: crypto.randomUUID(), text: '', done: false },
    { id: crypto.randomUUID(), text: '', done: false },
  ])

  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  const username = useMemo(() => {
    return user?.user_metadata?.user_name || user?.email || 'User'
  }, [user])

  const email = useMemo(() => user?.email || '', [user])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  function addTodo() {
    setTodos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: '', done: false },
    ])
  }

  function updateTodo(id, patch) {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, ...patch } : todo)))
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
  }

  async function submitFeedback() {
    const msg = feedbackText.trim()
    if (!msg) return

    setFeedbackSending(true)
    setFeedbackError('')
    setFeedbackSent(false)

    try {
      const { data: auth } = await supabase.auth.getUser()
      const u = auth?.user

      const { error } = await supabase.from('feedback').insert([
        {
          user_id: u?.id ?? null,
          username: u?.user_metadata?.user_name ?? null,
          email: u?.email ?? null,
          message: msg,
          page: window.location.pathname,
        },
      ])

      if (error) throw error

      setFeedbackSent(true)
      setFeedbackText('')

      setTimeout(() => {
        setFeedbackOpen(false)
        setFeedbackSent(false)
      }, 900)
    } catch (e) {
      setFeedbackError(e?.message || 'Failed to send feedback')
    } finally {
      setFeedbackSending(false)
    }
  }

  return (
    <div className="dashboard relative min-h-screen w-full px-5 py-10 md:px-20 md:py-10 flex flex-col items-center">
      {/* Hamburger tetap pojok kiri atas */}
      <div className="absolute top-5 left-5 z-[90]">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? t('dashboard.closeMenu') : t('dashboard.openMenu')}
        >
          <span className="hamburger-icon">{sidebarOpen ? '✖' : '☰'}</span>
        </button>
      </div>

      {/* TOP NAV */}
      <header className="topnav">
        <div className="topnav-inner">
          <div className="topnav-left">
            <div className="topnav-title">{t('dashboard.title')}</div>
            <div className="topnav-subtitle">{t('dashboard.greeting', { name: username })}</div>
          </div>

          <div className="topnav-center">
            <img className="h-20" src="/Logo.webp" alt="KASANE TETO" />
          </div>

          <div className="topnav-right">
            <div className="topnav-date">
              {now.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <div className="topnav-time">
              {now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar + Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setSidebarOpen(false)
        }}
      >
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-profile">
              <div className="sidebar-avatar" aria-hidden="true">
                <span>{(username || 'U').slice(0, 1).toUpperCase()}</span>
              </div>

              <div className="sidebar-profile-text">
                <div className="sidebar-name">{username}</div>
                {email ? <div className="sidebar-email">{email}</div> : null}
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button
              className="menu-item"
              onClick={() => {
                setSidebarOpen(false)
                setFeedbackOpen(true)
              }}
            >
              <img className="menu-icon" src={feedbackIcon} alt="" aria-hidden="true" />
              <span>{t('dashboard.feedback')}</span>
            </button>

            <Link
              to="/settings"
              className="menu-item"
              onClick={() => setSidebarOpen(false)}
            >
              <img className="menu-icon" src={settingsIcon} alt="" aria-hidden="true" />
              <span>{t('dashboard.settings')}</span>
            </Link>
            <div className="menu-divider" />

            <button
              className="menu-item menu-item-danger"
              onClick={() => {
                setSidebarOpen(false)
                logout()
              }}
            >
              <img className="menu-icon" src={logoutIcon} alt="" aria-hidden="true" />
              <span>{t('dashboard.logout')}</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-footer-hint">
              {t('dashboard.sidebarTip')}
            </div>
          </div>
        </aside>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 mb-10 max-w-5xl w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <Link
            to="/chat"
            className="card card-chat group flex flex-col text-decoration-none overflow-hidden hover:shadow-xl hover:translate-y-[-6px] transition-all duration-300 cursor-pointer"
          >
            <div className="card-image w-full h-44 bg-cover bg-center bg-no-repeat" />
            <div className="card-content px-5 py-5 text-center">
              <h3 className="m-0 text-gray-800 text-lg font-semibold border-t border-pink-100 pt-3">
                {t('dashboard.chatTitle')}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {t('dashboard.chatDescription')}
              </p>
            </div>
          </Link>

          <Link
            to="/chess"
            className="card card-chess group flex flex-col text-decoration-none overflow-hidden hover:shadow-xl hover:translate-y-[-6px] transition-all duration-300 cursor-pointer"
          >
            <div className="card-image w-full h-44 bg-cover bg-center bg-no-repeat" />
            <div className="card-content px-5 py-5 text-center">
              <h3 className="m-0 text-gray-800 text-lg font-semibold border-t border-pink-100 pt-3">
                {t('dashboard.chessTitle')}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {t('dashboard.chessDescription')}
              </p>
            </div>
          </Link>
        </div>

        {/* Right: Todo Panel */}
        <div className="panel px-5 py-5 todo-panel">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{t('dashboard.today')}</h3>
              <div className="text-xs text-gray-500">
                {todos.length} {todos.length === 1 ? t('dashboard.task') : t('dashboard.tasks')}
              </div>
            </div>

            <button className="todo-add" type="button" onClick={addTodo}>
              {t('dashboard.addTask')}
            </button>
          </div>

          {/* Scroll hanya kalau task > 3 */}
          <div className={`todo-list ${todos.length > 3 ? 'is-scroll' : ''}`}>
            {todos.map((todo) => (
              <div className={`todo-row ${todo.done ? 'is-done' : ''}`} key={todo.id}>
                <input
                  className="todo-checkbox"
                  type="checkbox"
                  checked={todo.done}
                  onChange={(e) => updateTodo(todo.id, { done: e.target.checked })}
                />

                <input
                  className="todo-input"
                  value={todo.text}
                  placeholder={t('dashboard.addTaskPlaceholder')}
                  onChange={(e) => updateTodo(todo.id, { text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTodo()
                  }}
                />

                <button
                  type="button"
                  className="todo-delete"
                  onClick={() => deleteTodo(todo.id)}
                  aria-label={t('dashboard.deleteTask')}
                  title={t('dashboard.deleteTask')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Tip selalu stay di kiri bawah panel */}
          <div className="todo-tip text-xs text-gray-500">
            {t('dashboard.addTaskTip')}
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {feedbackOpen && (
        <div
          className="feedback-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFeedbackOpen(false)
          }}
        >
          <div className="feedback-modal" role="dialog" aria-modal="true" aria-label={t('dashboard.sendFeedback')}>
            <div className="feedback-title">
              <h3>{t('dashboard.sendFeedback')}</h3>
              <button
                type="button"
                className="feedback-close"
                onClick={() => setFeedbackOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p className="feedback-subtitle">
              {t('dashboard.feedbackSubtitle')}
            </p>

            <textarea
              className="feedback-textarea"
              value={feedbackText}
              placeholder={t('dashboard.feedbackPlaceholder')}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={5}
            />

            {feedbackError && <div className="feedback-error">{feedbackError}</div>}
            {feedbackSent && <div className="feedback-success">{t('dashboard.feedbackSuccess')}</div>}

            <div className="feedback-actions">
              <button
                type="button"
                className="feedback-cancel"
                onClick={() => setFeedbackOpen(false)}
                disabled={feedbackSending}
              >
                {t('dashboard.cancel')}
              </button>
              <button
                type="button"
                className="feedback-send"
                onClick={submitFeedback}
                disabled={feedbackSending || !feedbackText.trim()}
              >
                {feedbackSending ? t('dashboard.sending') : t('dashboard.send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}