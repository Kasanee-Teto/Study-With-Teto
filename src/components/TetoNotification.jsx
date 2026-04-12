import { useState, useEffect } from 'react'
import { notificationService } from '../services/notificationServices'

export default function TetoNotification() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if notifications are enabled
    if (!notificationService.isEnabled()) {
      return
    }

    // Show notification after a random delay (2-8 minutes)
    const delay = Math.random() * (8 * 60 * 1000 - 2 * 60 * 1000) + 2 * 60 * 1000
    
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
  }

  
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-pink-200 to-pink-100 rounded-2xl shadow-2xl p-8 max-w-sm mx-4 border-2 border-pink-400 animate-bounce">
        <div className="text-center">
          <p className="text-3xl mb-4">💕</p>
          <h2 className="text-2xl font-bold text-pink-900 mb-4">Teto misses you</h2>
          <p className="text-pink-800 mb-6 text-sm">
            Come back and chat with me anytime!
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-lg transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}