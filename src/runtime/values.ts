import type { FunctionStmt } from '@/frontend/stmt'
import type { Interpreter } from './interpreter'
import { Environment } from './environment'
// import { Return } from './exceptions'

/**
 * Represents a Lox value at runtime.
 */
export type LoxObject = LoxCallable | string | number | boolean | null

export abstract class LoxCallable {
  abstract arity(): number
  abstract call(interpreter: Interpreter, args: LoxObject[]): LoxObject
  abstract toString(): string
}

export class LoxClockFn extends LoxCallable {
  arity(): number {
    return 0
  }

  call(): LoxObject {
    return Date.now() // ms since epoch
  }

  toString(): string {
    return '<native fn>'
  }
}

export class LoxFunction extends LoxCallable {
  static Return = class Return extends Error {
    name = 'ReturnException'
    value: LoxObject

    constructor(value: LoxObject) {
      super()
      this.value = value
    }
  }

  constructor(private declaration: FunctionStmt) {
    super()
  }

  arity(): number {
    return this.declaration.params.length
  }

  call(interpreter: Interpreter, args: LoxObject[]): LoxObject {
    let environment = new Environment(interpreter.globals)

    // bind arguments to parameters
    for (let i = 0; i < this.declaration.params.length; i++) {
      let param = this.declaration.params[i]
      let arg = args[i]
      environment.define(param.lexeme, arg)
    }

    try {
      interpreter.executeBlock(this.declaration.body, environment)
    } catch (err) {
      if (err instanceof LoxFunction.Return) return err.value
    }
    return null
  }

  toString(): string {
    return `<fn ${this.declaration.name.lexeme}>`
  }
}
