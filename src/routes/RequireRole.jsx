import { Navigate } from 'react-router-dom'
import { useAuth } from '../shared/hooks/useAuth'

// Wrap any screen that should only be reachable by a given role.
// Usage: <RequireRole role="admin"><AdminDashboard /></RequireRole>
export default function RequireRole({ role, children }) {
  const { user, role: userRole, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="font-body text-slate">Loading…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (userRole !== role) return <Navigate to="/" replace />

  return children
}
