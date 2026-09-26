// 인증 컨텍스트 — 세션 관리 + 권한 가드
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getBackend, type Session } from './db'
import type { Role } from './types'

interface AuthState {
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<Session>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  hasRole: (...roles: Role[]) => boolean
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBackend().getSession().then(s => { setSession(s); setLoading(false) })
  }, [])

  const value: AuthState = {
    session, loading,
    async signIn(email, password) {
      const s = await getBackend().signIn(email, password)
      setSession(s)
      return s
    },
    async signOut() {
      await getBackend().signOut()
      setSession(null)
    },
    async refresh() {
      setSession(await getBackend().getSession())
    },
    hasRole(...roles) {
      return !!session && roles.includes(session.profile.role)
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('AuthProvider 밖에서 useAuth 사용')
  return v
}
