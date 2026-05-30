import { useEffect, useMemo, useRef, useState } from 'react'
import { faIconClass, filterIcons, normalizeFaIcon, totalSolidIconCount } from '../lib/iconLibrary'

type Props = {
  value: string
  onChange: (icon: string) => void
  /** 嵌入卡片时使用，不显示外层字段标题 */
  compact?: boolean
  id?: string
}

export function IconPickerInput({ value, onChange, compact = false, id }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const anchorRef = useRef<HTMLDivElement>(null)
  const normalized = normalizeFaIcon(value)
  const icons = useMemo(() => filterIcons(query), [query])
  const totalIcons = totalSolidIconCount()
  const searching = query.trim().length > 0

  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(ev: MouseEvent) {
      if (!anchorRef.current?.contains(ev.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function selectIcon(code: string) {
    onChange(code)
    setOpen(false)
  }

  return (
    <div className={`icon-picker-field${compact ? ' icon-picker-field--compact' : ''}`}>
      {!compact ? (
        <span className="icon-picker-field__label" id={id}>
          图标（Font Awesome，如 fa-code）
        </span>
      ) : (
        <span className="icon-picker-field__label" id={id}>
          图标
        </span>
      )}
      <div className="icon-picker-field__anchor" ref={anchorRef}>
        <div className="icon-picker-field__row">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="fa-code"
            aria-labelledby={id}
          />
          <button
            type="button"
            className="btn icon-picker-field__pick"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '收起' : '选择'}
          </button>
        </div>
        {open ? (
          <div className="icon-picker-field__library">
            <div className="icon-picker-field__search">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索图标，如 cloud、user…"
                autoFocus
              />
              <span className="icon-picker-field__count muted small">
                {searching ? `${icons.length} 个匹配` : `${icons.length} / ${totalIcons} 个`}
              </span>
            </div>
            {!searching ? (
              <p className="icon-picker-field__hint muted small">默认展示前 96 个，输入关键词搜索全部 solid 图标</p>
            ) : null}
            <div className="icon-picker-field__grid" role="listbox" aria-label="图标库">
              {icons.length === 0 ? (
                <p className="icon-picker-field__empty muted small">没有匹配的图标，可直接在上方输入框填写 class</p>
              ) : (
                icons.map((code) => {
                  const active = normalized === code
                  return (
                    <button
                      key={code}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`icon-picker-field__option${active ? ' is-active' : ''}`}
                      title={code}
                      onClick={() => selectIcon(code)}
                    >
                      <i className={faIconClass(code)} aria-hidden="true" />
                      <span>{code}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function IconPickerField(props: Omit<Props, 'compact'>) {
  return <IconPickerInput {...props} />
}
