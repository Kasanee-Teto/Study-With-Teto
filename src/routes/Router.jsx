import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './RequireAuth.jsx'
import Login from '../pages/Login.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Chat from '../pages/Chat.jsx'
import Chess from '../pages/Chess.jsx'

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/dashboard"
          element={<RequireAuth><Dashboard /></RequireAuth>}
        />
        <Route
          path="/chat"
          element={<RequireAuth><Chat /></RequireAuth>}
        />
        <Route
          path="/chess"
          element={<RequireAuth><Chess /></RequireAuth>}
        />
      </Routes>
    </BrowserRouter>
  )
}