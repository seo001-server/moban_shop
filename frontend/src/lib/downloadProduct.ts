import { ApiError, getToken } from '../api/http'
import { unwrapEnvelope } from '../api/envelope'

type DownloadRedirect = {
  url: string
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      return star[1].trim()
    }
  }
  const plain = /filename="([^"]+)"/i.exec(header)
  if (plain?.[1]) return plain[1]
  return fallback
}

/** 请求受权下载接口：本地文件触发浏览器保存，外链返回后在新窗口打开。 */
export async function downloadProduct(productId: number, fallbackName?: string): Promise<void> {
  const token = getToken()
  if (!token) {
    throw new ApiError(401, '请先登录')
  }

  const res = await fetch(`/api/downloads/products/${productId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json, application/octet-stream, */*',
    },
  })

  const contentType = res.headers.get('Content-Type') ?? ''

  if (!res.ok) {
    let message = res.statusText || '下载失败'
    try {
      const body = await res.json()
      if (typeof body === 'object' && body !== null) {
        if ('message' in body && typeof (body as { message: unknown }).message === 'string') {
          message = (body as { message: string }).message
        } else {
          try {
            unwrapEnvelope<unknown>(body, res.status)
          } catch (e) {
            if (e instanceof ApiError) message = e.message
          }
        }
      }
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, message)
  }

  if (contentType.includes('application/json')) {
    const body = await res.json()
    const data = unwrapEnvelope<DownloadRedirect>(body, res.status)
    if (!data.url?.trim()) {
      throw new ApiError(res.status, '下载地址无效')
    }
    window.open(data.url, '_blank', 'noopener,noreferrer')
    return
  }

  const blob = await res.blob()
  const filename = filenameFromDisposition(
    res.headers.get('Content-Disposition'),
    fallbackName ?? `template-${productId}.zip`,
  )
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
