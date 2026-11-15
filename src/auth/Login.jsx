import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../shared/firebase'
import { useAuth } from '../shared/hooks/useAuth'

const ERROR_TEXT = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-disabled': 'This account has been disabled. Ask an admin.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.'
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p className="font-display text-2xl text-ink tracking-tight">Chikondi Store</p>
        {children}
      </div>
    </div>
  )
}

export default function Login() {
  const { user, role, loading, error: profileError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (loading) {
    return (
      <Shell>
        <p className="font-body text-slate mt-4">Loading…</p>
      </Shell>
    )
  }

  // Signed in with a valid, active role: go to the cashier screen.
  if (user && role) return <Navigate to="/" replace />

  // Signed in, but no usable role.
  if (user && !role) {
    return (
      <Shell>
        <p className="font-body text-sm text-ink mt-4" role="alert">
          {profileError === 'permission-denied'
            ? "Your account can't be read yet. The Firestore security rules may not be published."
            : "Your account isn't set up, or it has been disabled. Ask an admin."}
        </p>
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="mt-4 w-full min-h-[44px] rounded border border-ink/20 font-body text-sm text-ink active:bg-ink/5"
        >
          Sign out
        </button>
      </Shell>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      // useAuth picks up the new user and the redirect above takes over.
    } catch (err) {
      setError(ERROR_TEXT[err.code] || 'Could not sign in. Try again.')
      setBusy(false)
    }
  }

  return (
    <Shell>
      <p className="font-body text-sm text-slate mt-1">Sign in to continue</p>

      <form onSubmit={handleSubmit} className="mt-6">
        <label htmlFor="email" className="block font-body text-sm text-ink mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full min-h-[44px] px-3 rounded border border-ink/20 bg-white font-body text-ink"
        />

        <label htmlFor="password" className="block font-body text-sm text-ink mb-1 mt-4">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full min-h-[44px] px-3 rounded border border-ink/20 bg-white font-body text-ink"
        />

        {error && (
          <p className="font-body text-sm text-signal mt-3" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full min-h-[48px] rounded bg-amber font-display text-ink active:bg-amber-dim disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </Shell>
  )
}
