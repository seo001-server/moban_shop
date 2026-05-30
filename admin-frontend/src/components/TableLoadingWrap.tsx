import type { ReactNode } from 'react'

type TableLoadingWrapProps = {
  refreshing?: boolean
  children: ReactNode
  className?: string
}

export function TableLoadingWrap({ refreshing, children, className = '' }: TableLoadingWrapProps) {
  return (
    <div className={`table-wrap${refreshing ? ' table-wrap--refreshing' : ''}${className ? ` ${className}` : ''}`}>
      {refreshing ? (
        <div className="table-wrap__overlay" role="status" aria-live="polite" aria-label="加载中">
          <span className="table-wrap__spinner" aria-hidden="true" />
        </div>
      ) : null}
      {children}
    </div>
  )
}
