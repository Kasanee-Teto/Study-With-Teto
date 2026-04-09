import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useEffect, useState } from 'react'
import './dashboard.css'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <div className="user-info">Logged in as: {user?.user_metadata?.user_name || user?.email}</div>
      </div>

      <div className="dashboard-cards">
        <Link to="/chat" className="card card-chat">
          <div className="card-image"></div>
          <div className="card-content">
            <h3>Chat with Teto</h3>
          </div>
        </Link>

        <Link to="/chess" className="card card-chess">
          <div className="card-image"></div>
          <div className="card-content">
            <h3>Play Chess vs Teto</h3>
          </div>
        </Link>
      </div>

      <button className="logout-btn" onClick={logout}>Logout</button>
    </div>
  )
}