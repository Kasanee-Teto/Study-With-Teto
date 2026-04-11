import { Link } from 'react-router-dom'

export default function Settings() {
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
            className="px-4 py-2 rounded-xl border border-pink-200 bg-white/70 text-gray-800"
          >
            ← Back
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-pink-100 bg-white/70 p-4">
            <h3 className="font-bold text-gray-800">Appearance</h3>
            <p className="text-sm text-gray-600 mt-1">
              Theme, accent color, background blur (soon).
            </p>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white/70 p-4">
            <h3 className="font-bold text-gray-800">Chat</h3>
            <p className="text-sm text-gray-600 mt-1">
              Language, response length, tone (soon).
            </p>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white/70 p-4">
            <h3 className="font-bold text-gray-800">Notifications</h3>
            <p className="text-sm text-gray-600 mt-1">
              In-app reminder (soon).
            </p>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white/70 p-4">
            <h3 className="font-bold text-gray-800">Privacy</h3>
            <p className="text-sm text-gray-600 mt-1">
              Export data, analytics toggle (soon).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}