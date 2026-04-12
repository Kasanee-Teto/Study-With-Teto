import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function RequireAuth({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    let mounted = true

    // Bootstrap: resolve session first, then subscribe to changes.
    // This avoids the race where onAuthStateChange fires before getSession resolves
    // and incorrectly sets loading=false with a null session.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // Only update session after bootstrap is complete (loading=false)
      if (!mounted) return
      setSession(s)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  if (loading) return <div>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}