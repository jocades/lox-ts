import type { FunctionStmt } from '@/frontend/stmt'
import type { Interpreter } from './interpreter'
import { Environment } from './environment'

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

    interpreter.executeBlock(this.declaration.body, environment)
    return null
  }

  toString(): string {
    return `<fn ${this.declaration.name.lexeme}>`
  }
}
