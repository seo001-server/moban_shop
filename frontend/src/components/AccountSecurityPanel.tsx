import { type FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/http'
import { useToast } from '../context/ToastContext'

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  autoComplete: string
  hint?: string
  onChange: (value: string) => void
}

function PasswordField({ id, label, value, autoComplete, hint, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="account-security-field">
      <label htmlFor={id}>{label}</label>
      <div className="account-security-input-wrap">
        <i className="fas fa-lock account-security-input-icon" aria-hidden />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          required
          minLength={autoComplete === 'current-password' ? undefined : 8}
        />
        <button
          type="button"
          className="account-security-toggle"
          aria-label={visible ? '隐藏密码' : '显示密码'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <i className={visible ? 'fas fa-eye-slash' : 'fas fa-eye'} aria-hidden />
        </button>
      </div>
      {hint ? <p className="account-security-hint muted small">{hint}</p> : null}
    </div>
  )
}

function RequirementItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`account-security-req${ok ? ' is-ok' : ''}`}>
      <i className={`fas ${ok ? 'fa-check-circle' : 'fa-circle'} account-security-req-icon`} aria-hidden />
      {text}
    </li>
  )
}

export function AccountSecurityPanel() {
  const { showToast } = useToast()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reqLen = newPassword.length >= 8
  const reqMatch = newPassword.length > 0 && newPassword === confirmPassword
  const canSubmit = useMemo(
    () => oldPassword.length > 0 && reqLen && reqMatch && !submitting,
    [oldPassword, reqLen, reqMatch, submitting],
  )

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    if (newPassword !== confirmPassword) {
      setErr('两次输入的新密码不一致')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch<null>('/api/me/password', {
        method: 'POST',
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('密码已更新')
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : '修改密码失败'
      setErr(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      className="account-panel account-security-panel"
      id="panel-security"
      role="tabpanel"
      aria-labelledby="tab-security"
    >
      <div className="account-panel-head">
        <div>
          <h1 className="account-panel-title">账户安全</h1>
          <p className="account-panel-sub">修改登录密码，建议定期更换并使用强密码</p>
        </div>
      </div>

      <div className="account-security-layout">
        <div className="account-security-form-card">
          <div className="account-security-form-head">
            <span className="account-security-form-icon" aria-hidden>
              <i className="fas fa-key" />
            </span>
            <div>
              <h2 className="account-security-form-title">修改登录密码</h2>
              <p className="muted small">更新后请使用新密码重新登录其他设备</p>
            </div>
          </div>

          {err ? (
            <div className="account-security-alert" role="alert">
              <i className="fas fa-exclamation-circle" aria-hidden />
              <span>{err}</span>
            </div>
          ) : null}

          <form className="account-security-form" onSubmit={onSubmit}>
            <PasswordField
              id="security-old-password"
              label="当前密码"
              value={oldPassword}
              autoComplete="current-password"
              onChange={setOldPassword}
            />
            <PasswordField
              id="security-new-password"
              label="新密码"
              value={newPassword}
              autoComplete="new-password"
              hint="至少 8 位，建议包含字母与数字"
              onChange={setNewPassword}
            />
            <PasswordField
              id="security-confirm-password"
              label="确认新密码"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={setConfirmPassword}
            />

            <div className="account-security-actions">
              <button type="submit" className="btn btn-primary account-security-submit" disabled={!canSubmit}>
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin" aria-hidden /> 保存中…
                  </>
                ) : (
                  <>
                    <i className="fas fa-shield-alt" aria-hidden /> 更新密码
                  </>
                )}
              </button>
              <Link className="account-security-forgot" to="/forgot-password">
                忘记当前密码？
              </Link>
            </div>
          </form>
        </div>

        <aside className="account-security-aside" aria-label="密码安全建议">
          <h3 className="account-security-aside-title">
            <i className="fas fa-shield-alt" aria-hidden /> 密码建议
          </h3>
          <ul className="account-security-reqs">
            <RequirementItem ok={reqLen} text="至少 8 个字符" />
            <RequirementItem ok={reqMatch} text="两次新密码输入一致" />
          </ul>
          <div className="account-security-tips">
            <p className="account-security-tips-title">提升账户安全</p>
            <ul className="account-security-tips-list">
              <li>不要在多个网站重复使用同一密码</li>
              <li>避免使用生日、邮箱等容易被猜到的信息</li>
              <li>在公共设备上登录后及时退出</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}
