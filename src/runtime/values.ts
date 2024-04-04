import type { FunctionStmt } from '@/frontend/stmt'
import type { Interpreter } from './interpreter'
import { Environment } from './environment'
import type { FunctionExpr } from '@/frontend/expr'
import type { Token } from '@/frontend/lexer'
import { RuntimeError } from '@/lib/errors'
// import { Return } from './exceptions'

/**
 * Represents a Lox value at runtime.
 */
export type LoxObject =
  | LoxClass
  | LoxInstance
  | LoxCallable
  | string
  | number
  | boolean
  | null

export abstract class LoxCallable {
  abstract arity(): number
  abstract call(interpreter: Interpreter, args: LoxObject[]): LoxObject
  abstract toString(): string
}

export class LoxClass extends LoxCallable {
  constructor(public name: string) {
    super()
  }

  arity(): number {
    return 0
  }

  call(interpreter: Interpreter, args: LoxObject[]): LoxInstance {
    let instance = new LoxInstance(this)
    return instance
  }

  toString(): string {
    return this.name
  }
}

export class LoxInstance {
  private klass: LoxClass
  private fields: Map<string, LoxObject> = new Map()

  constructor(klass: LoxClass) {
    this.klass = klass
  }

  get(name: Token): LoxObject {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme)!
    }

    let method = this.klass.findMethod(name)
    if (method) return method.bind(this)

    throw new RuntimeError(
      name,
      `'${this.klass.name}' has no attribute '${name.lexeme}'.`,
    )
  }

  set(name: Token, value: LoxObject): void {
    this.fields.set(name.lexeme, value)
  }

  toString(): string {
    return `${this.klass.name} instance`
  }
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
