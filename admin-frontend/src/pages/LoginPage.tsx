import { type FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/http'
import type { TokenResponse } from '../api/types'
import { adminApiFetch, setAdminToken } from '../api/adminHttp'
import { storefrontUrl } from '../config/storefront'

export default function LoginPage() {
  const nav = useNavigate()
  const location = useLocation()
  const sessionExpired =
    (location.state as { reason?: string } | null)?.reason === 'session_expired'
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      const res = await adminApiFetch<TokenResponse>('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ account, password }),
        skipAuth: true,
      })
      setAdminToken(res.access_token)
      nav('/', { replace: true })
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.message === '禁止访问') {
          setErr('无权访问后台（需管理员账号）')
        } else {
          setErr(e.message)
        }
      } else {
        setErr('登录失败')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <span className="login-card__brand">Moban Shop</span>
          <h1 className="login-card__title">后台登录</h1>
        </div>

        {sessionExpired ? (
          <div className="alert alert--info" role="status" style={{ marginBottom: '1.25rem' }}>
            登录已过期或无效，请重新登录。
          </div>
        ) : null}

        <form className="stack form" onSubmit={onSubmit}>
          <label>
            账号
            <input
              type="text"
              autoComplete="username"
              value={account}
              onChange={(ev) => setAccount(ev.target.value)}
              required
              autoFocus
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
          {err ? (
            <div className="alert alert--error" role="alert">
              {err}
            </div>
          ) : null}
          <button type="submit" className="btn primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? '登录中…' : '登录'}
          </button>
        </form>

        <div className="login-card__footer">
          <p className="muted small">
            管理员账号独立于商城用户，由后台密钥签发 JWT。
          </p>
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            <a href={storefrontUrl('/')} style={{ textDecoration: 'underline' }}>
              返回商城前台
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
