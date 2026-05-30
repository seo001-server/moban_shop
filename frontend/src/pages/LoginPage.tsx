import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/http'
import type { TokenResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const nav = useNavigate()
  const [search] = useSearchParams()
  const from = search.get('from') || '/account'
  const { setSessionFromToken } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    try {
      const res = await apiFetch<TokenResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      })
      await setSessionFromToken(res.access_token)
      nav(from.startsWith('/') ? from : '/account', { replace: true })
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message)
      } else {
        setErr('登录失败')
      }
    }
  }

  return (
    <div className="container auth-page-simple">
      <div className="component-card auth-form-card">
        <div className="component-title auth-form-card-title">
          <h2>
            <i className="fas fa-sign-in-alt" /> 登录
          </h2>
        </div>
        <p className="auth-form-intro">使用商城前台用户邮箱登录</p>
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
            密码
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-register auth-submit-wide">
            登录
          </button>
        </form>
        {err ? (
          <p className="error" role="alert">
            {err}
          </p>
        ) : null}
        <p className="auth-switch muted">
          没有账号？<Link to="/register">去注册</Link>
        </p>
      </div>
    </div>
  )
}
