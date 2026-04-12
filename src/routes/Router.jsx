import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'

import RequireAuth from './RequireAuth.jsx'
import Login from '../pages/Login.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Chat from '../pages/Chat.jsx'
import Chess from '../pages/Chess.jsx'
import SignUpPage from '../pages/SignUp.jsx'

import Settings from '../pages/settings.jsx'
import AppearanceSettings from '../pages/Setting/Appearance.jsx'
import PrivacySettings from '../pages/Setting/Privacy.jsx'

const STORAGE_KEY = 'teto_settings_v1'

function applyTheme(theme) {
  const root = document.documentElement

  if (theme === 'system') {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
    root.dataset.theme = prefersDark ? 'dark' : 'light'
    return
  }

  root.dataset.theme = theme || 'light'
}

function applySettingsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const s = raw ? JSON.parse(raw) : {}
    const root = document.documentElement

    applyTheme(s.theme || 'light')

    if (typeof s.bgBlur === 'number') {
      root.style.setProperty('--teto-bg-blur', `${s.bgBlur}px`)
    }
    if (typeof s.overlayOpacity === 'number') {
      root.style.setProperty('--teto-overlay-opacity', String(s.overlayOpacity))
    }
  } catch {
    // ignore
  }
}

function NotFound() {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h2>404 — Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <a href="/">Go home</a>
    </div>
  )
}

export default function Router() {
  useEffect(() => {
    applySettingsFromStorage()

    // kalau theme = system, update saat OS theme berubah
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
    const handler = () => applySettingsFromStorage()

    if (mql?.addEventListener) mql.addEventListener('change', handler)
    else if (mql?.addListener) mql.addListener(handler)

    return () => {
      if (mql?.removeEventListener) mql.removeEventListener('change', handler)
      else if (mql?.removeListener) mql.removeListener(handler)
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <Chat />
            </RequireAuth>
          }
        />
        <Route
          path="/chess"
          element={
            <RequireAuth>
              <Chess />
            </RequireAuth>
          }
        />

        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />

        <Route
          path="/settings/appearance"
          element={
            <RequireAuth>
              <AppearanceSettings />
            </RequireAuth>
          }
        />

        <Route
          path="/settings/privacy"
          element={
            <RequireAuth>
              <PrivacySettings />
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}