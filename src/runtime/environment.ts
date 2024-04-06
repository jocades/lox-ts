import type { Token } from '@/frontend/lexer'
import type { LoxObject } from './values'
import { RuntimeError } from '@/lib/errors'

export class Environment {
  public enclosing?: Environment
  private values: Map<string, LoxObject> = new Map()

  constructor(enclosing?: Environment) {
    this.enclosing = enclosing
  }

  get(name: Token): LoxObject {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme)!
    }

    if (this.enclosing) {
      return this.enclosing.get(name)
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`)
  }

  assign(name: Token, value: LoxObject): void {
    if (this.values.has(name.lexeme)) {
      // allow shadowing in the same scope
      this.values.set(name.lexeme, value)
      return
    }

    if (this.enclosing) {
      this.enclosing.assign(name, value)
      return
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`)
  }

  define(name: string, value: LoxObject): void {
    this.values.set(name, value)
  }

  ancestor(distance: number): Environment {
    let environment: Environment = this
    for (let i = 0; i < distance; i++) {
      environment = environment.enclosing!
    }
    return environment
  }

  getAt(distance: number, name: string): LoxObject {
    return this.ancestor(distance).values.get(name)!
  }

  assignAt(distance: number, name: Token, value: LoxObject): void {
    this.ancestor(distance).values.set(name.lexeme, value)
  }

  getThis(): LoxObject {
    return this.values.get('this')!
  }
}
