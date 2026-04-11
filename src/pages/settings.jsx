import { Link } from 'react-router-dom'
import { useState } from 'react'
import { notificationService } from '../services/notificationServices'
import './settings.css'

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    notificationService.isEnabled()
  )

  const handleNotificationToggle = () => {
    notificationService.toggle()
    setNotificationsEnabled((v) => !v)
  }

  return (
    <div className="min-h-screen w-full px-5 py-10 md:px-20 md:py-10 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white/85 backdrop-blur px-7 py-5 rounded-2xl shadow-md border border-pink-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl !font-bold !text-black m-0">Settings</h2>
            <p className="text-sm text-gray-600 mt-2">
              Set display, language, and chat preferences.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="settings-back-btn px-4 py-2 rounded-xl rounded-xl text-gray-800"
          >
            ← Back
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/settings/appearance" className="settings-card">
            <h3 className="!font-bold !text-black">Appearance</h3>
            <p className="text-sm text-gray-600 mt-1">
              Theme, accent color, background blur.
            </p>
          </Link>

          <div className="rounded-2xl border border-pink-100 bg-white/70 p-4">
            <h3 className="!font-bold !text-black">Chat</h3>
            <p className="text-sm text-gray-600 mt-1">
              Language, response length, tone (soon).
            </p>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="!font-bold !text-black">Notifications</h3>
                <p className="text-sm text-gray-600 mt-1">Teto misses you reminder</p>
              </div>

              <button
                type="button"
                onClick={handleNotificationToggle}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-pink-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <Link to="/settings/privacy" className="settings-card">
            <h3 className="!font-bold !text-black">Privacy</h3>
            <p className="text-sm text-gray-600 mt-1">
              Export data, analytics toggle.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}