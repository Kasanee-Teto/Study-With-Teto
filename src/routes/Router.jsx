import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './RequireAuth.jsx'
import Login from '../pages/Login.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Chat from '../pages/Chat.jsx'
import Chess from '../pages/Chess.jsx'
import SignUpPage from '../pages/SignUp.jsx'

function NotFound() {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h2>404 — Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <a href="/">Go home</a>
    </div>
  )
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
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

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}