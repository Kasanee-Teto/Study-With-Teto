import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { useTranslation } from '../i18n/useTranslation.js'

import RequireAuth from './RequireAuth.jsx'
import { ROUTES } from './paths.js'



const Login = lazy(() => import('../pages/auth/Login.jsx'))
const Dashboard = lazy(() => import('../pages/Dashboard.jsx'))
const Chat = lazy(() => import('../pages/Chat.jsx'))
const SignUpPage = lazy(() => import('../pages/auth/SignUp.jsx'))
const Settings = lazy(() => import('../pages/settings/Settings.jsx'))
const AppearanceSettings = lazy(() => import('../pages/settings/Appearance.jsx'))
const PrivacySettings = lazy(() => import('../pages/settings/Privacy.jsx'))
const Translator = lazy(() => import('../pages/translator/Translator.jsx'))
const VoiceCloning = lazy(() => import('../pages/voice-clone/VoiceClone.jsx'))

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
  const { t } = useTranslation()
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h2>{t('common.pageNotFound')}</h2>
      <p>{t('common.pageNotFoundDesc')}</p>
      <a href="/">{t('common.goHome')}</a>
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
        <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path={ROUTES.SIGNUP} element={<SignUpPage />} />
        <Route path={ROUTES.LOGIN} element={<Login />} />

        <Route
          path={ROUTES.DASHBOARD}
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path={ROUTES.CHAT}
          element={
            <RequireAuth>
              <Chat />
            </RequireAuth>
          }
        />

        <Route
          path={ROUTES.SETTINGS}
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />

        <Route
          path={ROUTES.SETTINGS_APPEARANCE}
          element={
            <RequireAuth>
              <AppearanceSettings />
            </RequireAuth>
          }
        />

        <Route
          path={ROUTES.SETTINGS_PRIVACY}
          element={
            <RequireAuth>
              <PrivacySettings />
            </RequireAuth>
          }
        />

        <Route
          path={ROUTES.TRANSLATOR}
          element={
            <RequireAuth>
              <Translator />
            </RequireAuth>
          }
        />

        <Route
          path={ROUTES.VOICE_CLONING}
          element={
            <RequireAuth>
              <VoiceCloning />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}