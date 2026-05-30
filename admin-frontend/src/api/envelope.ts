import { ApiError } from './http'

export type ApiEnvelope<T = unknown> = {
  code: number
  data: T
  message: string
}

const AUTH_FAILURE_MESSAGES = new Set([
  '缺少 Authorization 请求头',
  'Authorization 方案无效',
  '缺少 Bearer 令牌',
  '令牌无效',
  '未登录',
  '管理员不存在',
  '禁止访问',
])

export function isAuthFailureMessage(message: string): boolean {
  return AUTH_FAILURE_MESSAGES.has(message)
}

export function unwrapEnvelope<T>(body: unknown, httpStatus: number): T {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('code' in body) ||
    typeof (body as ApiEnvelope).code !== 'number'
  ) {
    throw new ApiError(httpStatus, '响应格式无效', body, -1)
  }
  const env = body as ApiEnvelope<T>
  if (env.code !== 200) {
    const msg = typeof env.message === 'string' && env.message ? env.message : '请求失败'
    throw new ApiError(httpStatus, msg, body, env.code)
  }
  return env.data as T
}
