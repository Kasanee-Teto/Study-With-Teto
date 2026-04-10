import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useEffect, useMemo, useState } from 'react'
import './dashboard.css'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()

  // Todo UI state (sementara lokal)
  const [todos, setTodos] = useState([
    { id: crypto.randomUUID(), text: '', done: false },
    { id: crypto.randomUUID(), text: '', done: false },
  ])

  const username = useMemo(() => {
    return user?.user_metadata?.user_name || user?.email || 'User'
  }, [user])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  function addTodo() {
    setTodos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: '', done: false },
    ])
  }

  function updateTodo(id, patch) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  return (
    <div className="dashboard relative min-h-screen w-full px-5 py-10 md:px-20 md:py-10 flex flex-col items-center">
      {/* Dropdown Menu */}
      <div className="absolute top-5 left-5">
        <button
          className="bg-pink-200 hover:bg-pink-300 text-gray-700 font-bold py-2 px-4 rounded-xl shadow-sm transition-all duration-300"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
          aria-label="Open menu"
        >
          ☰
        </button>

        <div
          className={`absolute left-0 mt-2 w-52 bg-white/90 backdrop-blur rounded-xl shadow-lg py-2 z-50 transition-all duration-300 ease-in-out origin-top-left ${
            dropdownOpen
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <button
            className="block w-full text-center px-3 py-2 hover:bg-pink-50 text-gray-700 font-medium transition-colors duration-200"
            onClick={() => setDropdownOpen(false)}
          >
            Settings (soon)
          </button>
          <hr className="my-2" />
          <button
            className="block w-full text-center px-3 py-2 hover:bg-red-50 text-red-500 font-medium transition-colors duration-200"
            onClick={() => {
              setDropdownOpen(false)
              logout()
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="dashboard-header text-center mb-10 bg-white/85 backdrop-blur px-7 py-5 rounded-2xl shadow-md border border-pink-100">
        <h2 className="text-3xl font-extrabold !text-pink-600">Dashboard</h2>
        <div className="text-rose-400/90 text-sm">Hi, {username}</div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 mb-10 max-w-5xl w-full">
        {/* Left: Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <Link
            to="/chat"
            className="card card-chat group flex flex-col text-decoration-none overflow-hidden hover:shadow-xl hover:translate-y-[-6px] transition-all duration-300 cursor-pointer"
          >
            <div className="card-image w-full h-44 bg-cover bg-center bg-no-repeat"></div>
            <div className="card-content px-5 py-5 text-center">
              <h3 className="m-0 text-gray-800 text-lg font-semibold border-t border-pink-100 pt-3">
                Chat with Teto
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Study resume, request a summary, or ask a quick question.
              </p>
            </div>
          </Link>

          <Link
            to="/chess"
            className="card card-chess group flex flex-col text-decoration-none overflow-hidden hover:shadow-xl hover:translate-y-[-6px] transition-all duration-300 cursor-pointer"
          >
            <div className="card-image w-full h-44 bg-cover bg-center bg-no-repeat"></div>
            <div className="card-content px-5 py-5 text-center">
              <h3 className="m-0 text-gray-800 text-lg font-semibold border-t border-pink-100 pt-3">
                Play Chess vs Teto
              </h3>
              <p className="mt-2 text-sm text-gray-600"> 
                  Focus training + step analysis (coming soon).
              </p>
            </div>
          </Link>
        </div>

        {/* Right: Todo Panel */}
        <div className="panel px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Today</h3>
            <button
              className="todo-add"
              type="button"
              onClick={addTodo}
              aria-label="Add task"
            >
              + Add task
            </button>
          </div>

          <div className="space-y-2">
            {todos.map((t) => (
              <div className="todo-row" key={t.id}>
                <input
                  className="todo-checkbox"
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => updateTodo(t.id, { done: e.target.checked })}
                />
                <input
                  className="todo-input"
                  value={t.text}
                  placeholder="Add Task…"
                  onChange={(e) => updateTodo(t.id, { text: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Tip: press “Add task”, write quickly, checklist done.
          </div>
        </div>
      </div>
    </div>
  )
}