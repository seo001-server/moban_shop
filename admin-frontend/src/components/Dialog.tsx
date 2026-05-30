import { type ReactNode, useEffect } from 'react'
import { useTabPageActive } from '../tabs/TabPageContext'

type DialogProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Dialog({ open, title, onClose, children }: DialogProps) {
  const tabActive = useTabPageActive()
  const visible = open && tabActive

  useEffect(() => {
    if (!visible) return
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <header className="dialog-header">
          <h2 id="dialog-title" className="dialog-header__title">
            {title}
          </h2>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  )
}
