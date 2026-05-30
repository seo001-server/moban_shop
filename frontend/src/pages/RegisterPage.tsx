import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/http'
import type { TokenResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../context/ToastContext'

function authRedirectPath(from: string | null): string {
  return from?.startsWith('/') ? from : '/account'
}

export default function RegisterPage() {
  const nav = useNavigate()
  const [search] = useSearchParams()
  const from = search.get('from')
  const redirectTo = authRedirectPath(from)
  const { setSessionFromToken } = useAuth()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    setSubmitting(true)
    try {
      const res = await apiFetch<TokenResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      })
      await setSessionFromToken(res.access_token)
      showToast('注册成功')
      nav(redirectTo, { replace: true })
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message)
      } else {
        setErr('注册失败')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container auth-page-simple">
      <div className="component-card auth-form-card">
        <div className="component-title auth-form-card-title">
          <h2>
            <i className="fas fa-user-plus" /> 注册
          </h2>
        </div>
        <p className="auth-form-intro">创建商城前台账号</p>
        <form className="stack form auth-fields" onSubmit={onSubmit}>
          <label>
            邮箱
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            密码（不少于 8 位）
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              minLength={8}
              required
            />
          </label>
          <button type="submit" className="btn btn-register auth-submit-wide" disabled={submitting}>
            {submitting ? '创建中…' : '创建账号'}
          </button>
        </form>
        {err ? (
          <p className="error" role="alert">
            {err}
          </p>
        ) : null}
        <p className="auth-switch muted">
          已有账号？
          <Link to={from ? `/login?from=${encodeURIComponent(from)}` : '/login'}>去登录</Link>
        </p>
      </div>
    </div>
  )
}
