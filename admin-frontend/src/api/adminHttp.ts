import { ApiError } from './http'
import { isAuthFailureMessage, unwrapEnvelope } from './envelope'

export const ADMIN_TOKEN_KEY = 'moban_shop_admin_token'

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string | null) {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  }
}

export type AdminLoginRedirectReason = 'session_expired'

type UnauthorizedHandler = (reason?: AdminLoginRedirectReason) => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/** Register SPA redirect handler (MainLayout). Falls back to hard navigation. */
export function setAdminUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

export function redirectToAdminLogin(reason?: AdminLoginRedirectReason) {
  setAdminToken(null)
  if (unauthorizedHandler) {
    unauthorizedHandler(reason)
    return
  }
  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}

async function readJSON(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export type AdminApiOpts = RequestInit & {
  skipAuth?: boolean
}

export async function adminApiFetch<T>(
  path: string,
  opts: AdminApiOpts = {},
): Promise<T> {
  const { skipAuth, ...rest } = opts
  const headers = new Headers(rest.headers)
  headers.set('Accept', 'application/json')

  if (!skipAuth) {
    const t = getAdminToken()
    if (t) {
      headers.set('Authorization', `Bearer ${t}`)
    }
  }

  if (rest.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(path, { ...rest, headers })
  const body = await readJSON(res)

  if (!res.ok) {
    const msg =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
        ? (body as { message: string }).message
        : res.statusText || '请求失败'
    throw new ApiError(res.status, msg, body)
  }

  try {
    return unwrapEnvelope<T>(body, res.status)
  } catch (err) {
    if (
      !skipAuth &&
      err instanceof ApiError &&
      (err.code === -1 || err.isAuthFailure()) &&
      isAuthFailureMessage(err.message)
    ) {
      redirectToAdminLogin('session_expired')
    }
    throw err
  }
}

/** Multipart upload without forcing JSON Content-Type. */
export async function adminApiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers = new Headers()
  headers.set('Accept', 'application/json')
  const t = getAdminToken()
  if (t) headers.set('Authorization', `Bearer ${t}`)

  const res = await fetch(path, { method: 'POST', headers, body: formData })
  const body = await readJSON(res)
  if (!res.ok) {
    const msg =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
        ? (body as { message: string }).message
        : res.statusText || '上传失败'
    throw new ApiError(res.status, msg, body)
  }
  return unwrapEnvelope<T>(body, res.status)
}

/** Download binary response (e.g. CSV export). */
export async function adminApiDownload(path: string): Promise<Blob> {
  const headers = new Headers()
  const t = getAdminToken()
  if (t) headers.set('Authorization', `Bearer ${t}`)

  const res = await fetch(path, { headers })
  if (!res.ok) {
    const body = await readJSON(res)
    const msg =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
        ? (body as { message: string }).message
        : res.statusText || '下载失败'
    throw new ApiError(res.status, msg, body)
  }
  return res.blob()
}
