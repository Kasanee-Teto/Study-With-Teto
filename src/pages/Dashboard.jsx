import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useEffect, useState } from 'react'
import './dashboard.css'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard relative min-h-screen w-full px-5 py-10 md:px-20 md:py-10 flex flex-col items-center">
      {/* Dropdown Menu */}
      <div className="absolute top-5 left-5">
        <button 
          className="bg-lime-400 hover:bg-lime-500 text-gray-800 font-bold py-2 px-4 rounded-lg transition-all duration-300"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          ☰
        </button>
        
        <div className={`absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 transition-all duration-300 ease-in-out origin-top-left ${dropdownOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <button
              className="block w-full text-center px-3 py-1 hover:bg-gray-100 text-gray-800 font-medium transition-colors duration-200"
              onClick={() => {
                setDropdownOpen(false)
              }}
            >
              Settings
            </button>
            <hr className="my-2" />
            <button
              className="block w-full text-center px-3 py-1 hover:bg-red-100 text-red-600 font-medium transition-colors duration-200"
              onClick={() => {
                setDropdownOpen(false)
                logout()
              }}
            >
              Logout
            </button>
          </div>
      </div>

      <div className="dashboard-header text-center mb-10 bg-pink-200 px-7 py-5 rounded-xl shadow-md">
        <h2 className="text-3xl font-bold text-gray-700">Dashboard</h2>
        <div className="text-gray-600 text-sm">Logged in as: {user?.user_metadata?.user_name || user?.email}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-10 max-w-2xl w-full">
        <Link to="/chat" className="card card-chat group flex flex-col text-decoration-none bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl hover:translate-y-[-8px] transition-all duration-300 cursor-pointer">
          <div className="card-image w-full h-48 bg-cover bg-center bg-no-repeat"></div>
          <div className="card-content px-5 py-5 text-center">
            <h3 className="m-0 text-gray-800 text-lg border-t-2 border-gray-100 pt-3.75">Chat with Teto</h3>
          </div>
        </Link>

        <Link to="/chess" className="card card-chess group flex flex-col text-decoration-none bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl hover:translate-y-[-8px] transition-all duration-300 cursor-pointer">
          <div className="card-image w-full h-48 bg-cover bg-center bg-no-repeat"></div>
          <div className="card-content px-5 py-5 text-center">
            <h3 className="m-0 text-gray-800 text-lg border-t-2 border-gray-100 pt-3.75">Play Chess vs Teto</h3>
          </div>
        </Link>
      </div>

      <button className="logout-btn px-7 py-3 bg-red-500 text-white border-none rounded-md cursor-pointer text-base font-medium transition-all duration-300 shadow-md hover:bg-red-600 hover:translate-y-[-2px]" onClick={logout}>Logout</button>
    </div>
  )
}