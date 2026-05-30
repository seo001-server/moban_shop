import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, apiFetch, getToken, setToken } from '../api/http'
import { unwrapEnvelope } from '../api/envelope'
import type { MeResponse } from '../api/types'

type AuthCtx = {
  token: string | null
  me: MeResponse['user'] | null
  setSessionFromToken: (accessToken: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const [me, setMe] = useState<MeResponse['user'] | null>(null)
  const [loading, setLoading] = useState(false)

  const logout = useCallback(() => {
    setToken(null)
    setTokenState(null)
    setMe(null)
  }, [])

  const refreshMe = useCallback(async () => {
    if (!getToken()) {
      setMe(null)
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch<MeResponse>('/api/me')
      setMe(data.user)
      setTokenState(getToken())
    } catch (err) {
      setMe(null)
      if (err instanceof ApiError && err.isAuthFailure()) {
        logout()
      }
    } finally {
      setLoading(false)
    }
  }, [logout])

  const setSessionFromToken = useCallback(async (accessToken: string) => {
    setToken(accessToken)
    setTokenState(accessToken)
    setLoading(true)
    try {
      const res = await fetch('/api/me', {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const raw = (await res.json()) as unknown
      if (!res.ok) {
        throw new ApiError(res.status, '认证失败', raw)
      }
      const data = unwrapEnvelope<MeResponse>(raw, res.status)
      setMe(data.user)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!getToken()) return
      setLoading(true)
      try {
        const data = await apiFetch<MeResponse>('/api/me')
        if (!alive) return
        setMe(data.user)
        setTokenState(getToken())
      } catch (err) {
        if (!alive) return
        setMe(null)
        if (err instanceof ApiError && err.isAuthFailure()) {
          setToken(null)
          setTokenState(null)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({
      token,
      me,
      setSessionFromToken,
      logout,
      refreshMe,
      loading,
    }),
    [loading, logout, me, refreshMe, setSessionFromToken, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth 须在 AuthProvider 内使用')
  }
  return ctx
}
