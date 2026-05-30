export class LoginRequiredError extends Error {
  constructor(message = '请先登录') {
    super(message)
    this.name = 'LoginRequiredError'
  }
}
