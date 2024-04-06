import type { Token } from '@/frontend/lexer'

export class Break extends Error {
  name = 'BreakException'
  token: Token

  constructor(token: Token, message: string) {
    super(message)
    this.token = token
  }
}
