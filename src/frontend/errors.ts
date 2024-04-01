export class SyntaxError extends Error {
  name = 'SyntaxError'
  line?: number
  where?: string

  constructor(message: string, line?: number, where?: string) {
    super(message)
    this.line = line
    this.where = where
  }
}
