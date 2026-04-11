import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import '../settings.css'

const STORAGE_KEY = 'teto_settings_v1'

function readSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeSettings(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function applyTheme(theme) {
  const root = document.documentElement

  if (theme === 'system') {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
    root.dataset.theme = prefersDark ? 'dark' : 'light'
    return
  }

  root.dataset.theme = theme || 'light'
}

export default function Appearance() {
  const initial = useMemo(() => readSettings(), [])

  const [theme, setTheme] = useState(initial.theme ?? 'light')
  const [bgBlur, setBgBlur] = useState(initial.bgBlur ?? 2)
  const [overlayOpacity, setOverlayOpacity] = useState(initial.overlayOpacity ?? 0.55)

  useEffect(() => {
    const next = { ...readSettings(), theme, bgBlur, overlayOpacity }
    writeSettings(next)

    // apply live
    applyTheme(theme)

    const root = document.documentElement
    root.style.setProperty('--teto-bg-blur', `${bgBlur}px`)
    root.style.setProperty('--teto-overlay-opacity', String(overlayOpacity))
  }, [theme, bgBlur, overlayOpacity])

  return (
    <div className="min-h-screen w-full px-5 py-10 md:px-20 md:py-10 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white/85 backdrop-blur px-7 py-6 rounded-2xl shadow-md border border-pink-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold !text-black m-0">Appearance</h2>
            <p className="text-sm text-gray-600 mt-2">
              Theme, background blur, dan overlay.
            </p>
          </div>

          <Link
            to="/settings"
            className="settings-back-btn px-4 py-2 rounded-xl border border-pink-200 bg-white/70 text-gray-800"
          >
            ← Back
          </Link>
        </div>

        <div className="mt-7 grid gap-4">
          <section className="appearance-card">
            <div className="appearance-card-head">
              <h3 className="appearance-title">Theme</h3>
              <span className="appearance-badge">{theme.toUpperCase()}</span>
            </div>

            <div className="appearance-chip-row">
              {['light', 'dark', 'system'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`appearance-chip ${theme === t ? 'is-active' : ''}`}
                  onClick={() => setTheme(t)}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="appearance-help">
              System = ikut theme OS (otomatis).
            </div>
          </section>

          <section className="appearance-card">
            <div className="appearance-card-head">
              <h3 className="appearance-title">Background blur</h3>
              <span className="appearance-value">{bgBlur}px</span>
            </div>

            <input
              className="appearance-range"
              type="range"
              min={0}
              max={10}
              step={1}
              value={bgBlur}
              onChange={(e) => setBgBlur(Number(e.target.value))}
            />

            <div className="appearance-help">0 = tajam, 10 = blur banget.</div>
          </section>

          <section className="appearance-card">
            <div className="appearance-card-head">
              <h3 className="appearance-title">Overlay opacity</h3>
              <span className="appearance-value">
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>

            <input
              className="appearance-range"
              type="range"
              min={0.2}
              max={0.9}
              step={0.05}
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(Number(e.target.value))}
            />

            <div className="appearance-help">
              Makin besar = background makin “ketutup”.
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}