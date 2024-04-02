import type { Token } from '../frontend/lexer'

export class ParseError {
  name = 'ParseError'
  line?: number
  where?: string
  message: string

  constructor(message: string, line?: number, where?: string) {
    this.message = message
    this.line = line
    this.where = where
  }
}

export class RuntimeError {
  name = 'RuntimeError'
  token: Token
  message: string

  constructor(token: Token, message: string) {
    // super(message)
    this.message = message
    this.token = token
  }
}
