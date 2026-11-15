import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './shared/hooks/useAuth'
import RequireRole from './routes/RequireRole'
import Login from './auth/Login'
import Checkout from './cashier/screens/Checkout'
import Dashboard from './admin/screens/Dashboard'

// The cashier screen is open to any active staff member (cashier or admin).
function StaffOnly({ children }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="font-body text-slate">Loading…</p>
      </div>
    )
  }

  if (!user || !role) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <StaffOnly>
                <Checkout />
              </StaffOnly>
            }
          />
          <Route
            path="/admin/*"
            element={
              <RequireRole role="admin">
                <Dashboard />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
