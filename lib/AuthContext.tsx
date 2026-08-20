'use client'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

type AuthState = {
  userId: string | null
  role: string | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({
  userId: null,
  role: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    userId: null,
    role: null,
    loading: true,
  })
  const resolvedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!active) return

        if (!session) {
          resolvedUserIdRef.current = null
          setState({ userId: null, role: null, loading: false })
          return
        }

        const uid = session.user.id
        if (resolvedUserIdRef.current === uid) return

        setState((prev) => ({ ...prev, userId: uid, loading: true }))

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', uid)
            .single()

          if (!active) return
          if (error) throw error

          resolvedUserIdRef.current = uid
          setState({ userId: uid, role: data?.role ?? null, loading: false })
        } catch (err) {
          if (!active) return
          console.error('[AuthContext] failed to load profile role', err)
          setState({ userId: uid, role: null, loading: false })
        }
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
