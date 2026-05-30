import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/http'
import type { PaginatedList } from '../api/types'
import { clampPage, PAGE_SIZE } from '../utils/pagination'

type UseServerPaginationOptions<T> = {
  fetchPage: (page: number, pageSize: number) => Promise<PaginatedList<T>>
  pageSize?: number
  resetKey?: string | number
}

export function useServerPagination<T>({
  fetchPage,
  pageSize = PAGE_SIZE,
  resetKey = '',
}: UseServerPaginationOptions<T>) {
  const [pageRaw, setPageRaw] = useState(1)
  const [result, setResult] = useState<PaginatedList<T> | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setPageRaw(1)
  }, [resetKey])

  const totalPages = result?.total_pages ?? 1
  const page = clampPage(pageRaw, totalPages)

  useEffect(() => {
    if (pageRaw !== page) {
      setPageRaw(page)
    }
  }, [page, pageRaw])

  const reload = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await fetchPage(page, pageSize)
      setResult(data)
      if (data.total_pages > 0 && page > data.total_pages) {
        setPageRaw(data.total_pages)
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message)
      } else {
        setErr('加载失败')
      }
    } finally {
      setLoading(false)
    }
  }, [fetchPage, page, pageSize])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr(null)
    ;(async () => {
      try {
        const data = await fetchPage(page, pageSize)
        if (!alive) return
        setResult(data)
        if (data.total_pages > 0 && page > data.total_pages) {
          setPageRaw(data.total_pages)
        }
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError) {
          setErr(e.message)
        } else {
          setErr('加载失败')
        }
        setResult(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [fetchPage, page, pageSize])

  const setPage = useCallback(
    (next: number) => {
      setPageRaw(clampPage(next, result?.total_pages ?? 1))
    },
    [result?.total_pages],
  )

  const items = result?.items ?? []

  return {
    page,
    setPage,
    items,
    total: result?.total ?? 0,
    totalPages: result?.total_pages ?? 1,
    pageSize,
    loading,
    refreshing: loading && items.length > 0,
    initialLoading: loading && items.length === 0,
    err,
    reload,
  }
}
