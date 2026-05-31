import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/http'
import { PageMeta, PAGE_DESCRIPTIONS } from '../components/PageMeta'
import { useToast } from '../context/ToastContext'

export default function ResetPasswordPage() {
  const nav = useNavigate()
  const [search] = useSearchParams()
  const token = search.get('token') ?? ''
  const { showToast } = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    if (!token) {
      setErr('重置链接无效，请重新申请')
      return
    }
    if (password !== confirm) {
      setErr('两次输入的密码不一致')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: password }),
        skipAuth: true,
      })
      showToast('密码已重置，请登录')
      nav('/login', { replace: true })
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '重置失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container auth-page-simple">
      <PageMeta title="重置密码" description={PAGE_DESCRIPTIONS.login} noIndex />
      <div className="component-card auth-form-card">
        <div className="component-title auth-form-card-title">
          <h2>
            <i className="fas fa-lock-open" /> 重置密码
          </h2>
        </div>
        {!token ? (
          <p className="error" role="alert">
            重置链接无效或已过期，请
            <Link to="/forgot-password"> 重新申请</Link>
          </p>
        ) : (
          <form className="stack form auth-fields" onSubmit={onSubmit}>
            <label>
              新密码
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                minLength={8}
                required
              />
            </label>
            <label>
              确认新密码
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(ev) => setConfirm(ev.target.value)}
                minLength={8}
                required
              />
            </label>
            <button type="submit" className="btn btn-register auth-submit-wide" disabled={submitting}>
              {submitting ? '保存中…' : '设置新密码'}
            </button>
          </form>
        )}
        {err ? (
          <p className="error" role="alert">
            {err}
          </p>
        ) : null}
        <p className="auth-switch muted">
          <Link to="/login">返回登录</Link>
        </p>
      </div>
    </div>
  )
}
