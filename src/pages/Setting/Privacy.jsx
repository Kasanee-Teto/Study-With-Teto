import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import '../settings.css'

const PRIVACY_STORAGE_KEY = 'teto_privacy_v1'

function readPrivacySettings() {
  try {
    const raw = localStorage.getItem(PRIVACY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writePrivacySettings(next) {
  localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(next))
}

export default function Privacy() {
  const initial = useMemo(() => readPrivacySettings(), [])
  const [analyticsEnabled, setAnalyticsEnabled] = useState(initial.analyticsEnabled ?? true)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const next = {
      ...readPrivacySettings(),
      analyticsEnabled,
    }
    writePrivacySettings(next)
  }, [analyticsEnabled])

  const handleExportData = async () => {
    setExportLoading(true)
    try {
      // Simulate data export - in production, this would call your API
      const userData = {
        settings: readPrivacySettings(),
        exportedAt: new Date().toISOString(),
      }

      const dataStr = JSON.stringify(userData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `teto-data-export-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to export data:', error)
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      // In production, this would call your API to delete the account
      // For now, we'll just clear local storage and redirect
      localStorage.clear()
      // Redirect to login
      window.location.href = '/login'
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert('Failed to delete account. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full px-5 py-10 md:px-20 md:py-10 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white/85 backdrop-blur px-7 py-6 rounded-2xl shadow-md border border-pink-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-black m-0">Privacy & Data</h2>
            <p className="text-sm text-gray-600 mt-2">
              Control your data and privacy settings.
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
          {/* ANALYTICS TOGGLE */}
          <section className="appearance-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="appearance-title">Analytics</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Help us improve by sharing anonymous usage data
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${
                  analyticsEnabled ? 'bg-pink-500' : 'bg-gray-300'
                }`}
                aria-pressed={analyticsEnabled}
                aria-label="Toggle analytics"
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    analyticsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="appearance-help mt-3">
              {analyticsEnabled
                ? 'Analytics is enabled'
                : 'Analytics is disabled - we will not collect usage data'}
            </div>
          </section>

          {/* DATA EXPORT */}
          <section className="appearance-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="appearance-title">Export Your Data</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Download a copy of your settings and personal data
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportData}
                disabled={exportLoading}
                className="px-4 py-2 rounded-xl border border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {exportLoading ? 'Exporting...' : 'Export'}
              </button>
            </div>
            {exportSuccess && (
              <div className="appearance-help mt-3 text-green-600">
                ✓ Data exported successfully
              </div>
            )}
            <div className="appearance-help mt-3">
              Your data will be downloaded as a JSON file that you can keep or import elsewhere.
            </div>
          </section>

          {/* DATA DELETION INFO */}
          <section className="appearance-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="appearance-title text-red-600">Delete Account</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-xl border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex-shrink-0"
              >
                Delete Account
              </button>
            </div>
          </section>

          {/* DELETE CONFIRMATION MODAL */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-red-600 mb-2">Delete Account?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This will permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="flex-1 px-4 py-2 rounded-lg border border-red-300 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
