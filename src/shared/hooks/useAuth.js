import { createContext, createElement, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

// The role comes from the signed-in user's own Firestore document:
//   users/{uid} -> { name, email, role: 'admin' | 'cashier', active: true }
// No Cloud Functions or custom claims are involved.
//
// While loading: loading is true.
// After loading:
//   user  - the Firebase user, or null when signed out
//   role  - 'admin' | 'cashier', or null when the account has no valid
//           role or has been disabled (active is not true)
//   profile - the users/{uid} document data, or null
//   error - a Firestore error code if the profile could not be read
//           (for example 'permission-denied' if rules are not published)

const AuthContext = createContext({
  user: null,
  role: null,
  profile: null,
  loading: true,
  error: null
})

const VALID_ROLES = ['admin', 'cashier']

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    role: null,
    profile: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ user: null, role: null, profile: null, loading: false, error: null })
        return
      }
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        const profile = snap.exists() ? snap.data() : null
        const role =
          profile && profile.active === true && VALID_ROLES.includes(profile.role)
            ? profile.role
            : null
        setState({ user: firebaseUser, role, profile, loading: false, error: null })
      } catch (err) {
        setState({
          user: firebaseUser,
          role: null,
          profile: null,
          loading: false,
          error: err.code || 'unknown'
        })
      }
    })
    return unsubscribe
  }, [])

  return createElement(AuthContext.Provider, { value: state }, children)
}

export function useAuth() {
  return useContext(AuthContext)
}
