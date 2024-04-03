import type { FunctionStmt } from '@/frontend/stmt'
import type { Interpreter } from './interpreter'
import { Environment } from './environment'
import type { FunctionExpr } from '@/frontend/expr'
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

export class LoxFunction extends LoxCallable {
  static Return = class Return {
    name = 'ReturnException'
    constructor(public value: LoxObject) {}
  }

  constructor(
    private name: string | null,
    private declaration: FunctionExpr,
    private closure: Environment,
  ) {
    super()
  }

  arity(): number {
    return this.declaration.params.length
  }

  call(interpreter: Interpreter, args: LoxObject[]): LoxObject {
    let environment = new Environment(this.closure)

    // bind arguments to parameters
    for (let i = 0; i < this.declaration.params.length; i++) {
      let param = this.declaration.params[i]
      environment.define(param.lexeme, args[i])
    }

    try {
      interpreter.executeBlock(this.declaration.body, environment)
    } catch (err) {
      if (err instanceof LoxFunction.Return) return err.value
    }
    return null
  }

  toString(): string {
    if (!this.name) return '<fn>'
    return `<fn> ${this.name}`
  }
}
