import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

export function GlobalSearch() {
  const nav = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const qFromUrl = location.pathname === '/products' ? (searchParams.get('q') ?? '') : ''
  const [draft, setDraft] = useState(qFromUrl)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(qFromUrl)
  }, [qFromUrl])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function close() {
    setOpen(false)
  }

  function submit(ev: FormEvent) {
    ev.preventDefault()
    const q = draft.trim()
    close()
    if (!q) {
      nav('/products')
      return
    }
    const params = new URLSearchParams()
    params.set('q', q)
    nav(`/products?${params.toString()}`)
  }

  const hasActiveQuery = Boolean(qFromUrl)

  return (
    <div className="global-search-wrap">
      <button
        type="button"
        className={`nav-btn-plain nav-icon-btn global-search-trigger${open || hasActiveQuery ? ' is-active' : ''}`}
        aria-label="搜索模板"
        aria-expanded={open}
        aria-controls="global-search-popover"
        title="搜索模板"
        onClick={() => setOpen(true)}
      >
        <i className="fas fa-search" aria-hidden />
      </button>

      {open ? (
        <>
          <button type="button" className="global-search-backdrop" aria-label="关闭搜索" onClick={close} />
          <div
            id="global-search-popover"
            className="global-search-popover"
            role="dialog"
            aria-modal="true"
            aria-label="搜索模板"
          >
            <div className="global-search-popover-head">
              <h2>搜索模板</h2>
              <button type="button" className="global-search-popover-close" aria-label="关闭" onClick={close}>
                <i className="fas fa-times" aria-hidden />
              </button>
            </div>
            <form className="global-search global-search-popover-form" role="search" onSubmit={submit}>
              <label className="visually-hidden" htmlFor="global-search-input">
                搜索模板
              </label>
              <i className="fas fa-search global-search-icon" aria-hidden />
              <input
                ref={inputRef}
                id="global-search-input"
                type="search"
                className="global-search-input"
                placeholder="搜索模板名称、关键词…"
                value={draft}
                onChange={(ev) => setDraft(ev.target.value)}
                autoComplete="off"
                enterKeyHint="search"
                maxLength={80}
              />
              {draft ? (
                <button
                  type="button"
                  className="global-search-clear"
                  aria-label="清空搜索"
                  onClick={() => setDraft('')}
                >
                  <i className="fas fa-times" aria-hidden />
                </button>
              ) : null}
              <button type="submit" className="global-search-submit">
                搜索
              </button>
            </form>
            <p className="global-search-popover-hint muted small">按 Enter 搜索，Esc 关闭</p>
          </div>
        </>
      ) : null}
    </div>
  )
}
