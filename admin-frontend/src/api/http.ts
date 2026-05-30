import { isAuthFailureMessage } from './envelope'

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

export { isAuthFailureMessage }
