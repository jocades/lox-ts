import type { Token } from '@/frontend/lexer'
import type { LoxObject } from './values'

export class Break extends Error {
  name = 'BreakException'
  token: Token

  constructor(token: Token, message: string) {
    super(message)
    this.token = token
  }
}

// export class Return extends Error {
//   name = 'ReturnException'
//   value: LoxObject
//
//   constructor(value: LoxObject) {
//     super()
//     this.value = value
//   }
// }
