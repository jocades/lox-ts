import type { Token } from '../frontend/lexer'

export class ParseError extends Error {
  name = 'ParseError'
  line?: number
  where?: string

  constructor(message: string, line?: number, where?: string) {
    super(message)
    this.line = line
    this.where = where
  }
}

export class RuntimeError extends Error {
  name = 'RuntimeError'
  token: Token

  constructor(token: Token, message: string) {
    super(message)
    this.token = token
  }
}
