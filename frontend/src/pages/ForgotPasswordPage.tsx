import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/http'
import { PageMeta, PAGE_DESCRIPTIONS } from '../components/PageMeta'
import { useToast } from '../context/ToastContext'

function resetLinkPath(url: string): string {
  if (url.startsWith('/')) return url
  try {
    const u = new URL(url)
    return `${u.pathname}${u.search}`
  } catch {
    return '/forgot-password'
  }
}
type ForgotResponse = {
  message: string
  reset_url?: string
}

export default function ForgotPasswordPage() {
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [resetURL, setResetURL] = useState<string | null>(null)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    setSubmitting(true)
    try {
      const res = await apiFetch<ForgotResponse>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      })
      setDone(true)
      if (res.reset_url) setResetURL(res.reset_url)
      showToast(res.message, 'info')
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '请求失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container auth-page-simple">
      <PageMeta title="找回密码" description={PAGE_DESCRIPTIONS.login} noIndex />
      <div className="component-card auth-form-card">
        <div className="component-title auth-form-card-title">
          <h2>
            <i className="fas fa-key" /> 找回密码
          </h2>
        </div>
        {done ? (
          <div className="auth-success-block">
            <p>若该邮箱已注册，请使用重置链接设置新密码。</p>
            {resetURL ? (
              <p className="auth-reset-link-wrap">
                <span className="muted small">开发环境重置链接：</span>
                <Link to={resetLinkPath(resetURL)}>打开重置页面</Link>
              </p>
            ) : null}
            <Link className="btn btn-secondary auth-submit-wide" to="/login">
              返回登录
            </Link>
          </div>
        ) : (
          <>
            <p className="auth-form-intro">输入注册邮箱，我们将为您生成密码重置方式</p>
            <form className="stack form auth-fields" onSubmit={onSubmit}>
              <label>
                邮箱
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn btn-register auth-submit-wide" disabled={submitting}>
                {submitting ? '提交中…' : '发送重置请求'}
              </button>
            </form>
          </>
        )}
        {err ? (
          <p className="error" role="alert">
            {err}
          </p>
        ) : null}
        <p className="auth-switch muted">
          想起密码了？
          <Link to="/login">返回登录</Link>
        </p>
      </div>
    </div>
  )
}
