import { isAuthFailureMessage, unwrapEnvelope } from './envelope'

export const TOKEN_KEY = 'moban_shop_token'

export class ApiError extends Error {
  status: number
  code: number
  body?: unknown

  constructor(status: number, message: string, body?: unknown, code = -1) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.body = body
  }

  isAuthFailure(): boolean {
    return isAuthFailureMessage(this.message)
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export type ApiOpts = RequestInit & {
  /** Do not attach stored Authorization header (registration / login calls). */
  skipAuth?: boolean
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

export async function apiFetch<T>(path: string, opts: ApiOpts = {}): Promise<T> {
  const { skipAuth, ...rest } = opts
  const headers = new Headers(rest.headers)
  headers.set('Accept', 'application/json')

  if (!skipAuth) {
    const t = getToken()
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

  return unwrapEnvelope<T>(body, res.status)
}
