import { type FormEvent, useState } from 'react'
import { ApiError } from '../api/http'
import { adminApiFetch } from '../api/adminHttp'
import type { AdminMeResponse, AdminProfile } from '../api/types'
import { useToast } from './Toast'

type AdminSettingsPanelProps = {
  admin: AdminProfile
  onUpdated: (admin: AdminProfile) => void
  onClose: () => void
}

export function AdminSettingsPanel({ admin, onUpdated, onClose }: AdminSettingsPanelProps) {
  const { showToast } = useToast()
  const [nickname, setNickname] = useState(admin.nickname)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSaveProfile(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    setSavingProfile(true)
    try {
      const res = await adminApiFetch<AdminMeResponse>('/api/admin/me', {
        method: 'PATCH',
        body: JSON.stringify({ nickname: nickname.trim() }),
      })
      onUpdated(res.admin)
      showToast('昵称已更新', 'success')
    } catch (e) {
      const message = e instanceof ApiError ? e.message : '保存失败'
      setErr(message)
      showToast(message, 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  async function onSavePassword(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    setSavingPassword(true)
    try {
      await adminApiFetch('/api/admin/me/password', {
        method: 'POST',
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      })
      setOldPassword('')
      setNewPassword('')
      showToast('密码已更新', 'success')
    } catch (e) {
      const message = e instanceof ApiError ? e.message : '修改密码失败'
      setErr(message)
      showToast(message, 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="stack">
      <p className="muted small">账号：{admin.account}</p>

      <form className="stack form" onSubmit={onSaveProfile}>
        <div className="form-section">
          <div className="form-section__title">昵称</div>
          <label>
            显示昵称
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={32}
              required
            />
          </label>
        </div>
        <div className="form-actions row gap">
          <button type="submit" className="btn primary" disabled={savingProfile}>
            {savingProfile ? '保存中…' : '保存昵称'}
          </button>
        </div>
      </form>

      <form className="stack form" onSubmit={onSavePassword}>
        <div className="form-section">
          <div className="form-section__title">修改密码</div>
          <label>
            原密码
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label>
            新密码（至少 8 位）
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
          </label>
        </div>
        <div className="form-actions row gap">
          <button type="submit" className="btn" disabled={savingPassword}>
            {savingPassword ? '提交中…' : '修改密码'}
          </button>
        </div>
      </form>

      {err ? (
        <div className="alert alert--error" role="alert">
          {err}
        </div>
      ) : null}

      <div className="form-actions row gap">
        <button type="button" className="btn" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  )
}
