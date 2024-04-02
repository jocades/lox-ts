import type { Token } from '@/frontend/lexer'
import type { LoxObject } from './values'
import { RuntimeError } from '@/lib/errors'

export class Environment {
  private values: Map<string, LoxObject> = new Map()

  public get(name: Token) {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme)
    }
    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`)
  }

  public assign(name: Token, value: LoxObject) {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value)
      return
    }
    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`)
  }

  public define(name: string, value: LoxObject): void {
    this.values.set(name, value)
  }
}
