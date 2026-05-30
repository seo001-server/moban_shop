import { getPageNumbers } from '../utils/pagination'

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(page, totalPages)

  return (
    <nav className="pagination" aria-label="列表分页">
      <button
        type="button"
        className="pagination__btn"
        disabled={page <= 1}
        onClick={() => onPageChange(1)}
      >
        首页
      </button>
      <button
        type="button"
        className="pagination__btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        上一页
      </button>
      <div className="pagination__pages" role="group" aria-label="页码">
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            className={`pagination__btn pagination__btn--page${n === page ? ' is-active' : ''}`}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onPageChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        下一页
      </button>
      <button
        type="button"
        className="pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(totalPages)}
      >
        尾页
      </button>
    </nav>
  )
}
