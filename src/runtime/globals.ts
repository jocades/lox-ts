import { LoxCallable, type LoxObject } from './values'
import type { Interpreter } from './interpreter'

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

export class LoxLenFn extends LoxCallable {
  arity(): number {
    return 1
  }

  call(_: Interpreter, arg: LoxObject[]): LoxObject {
    if (typeof arg[0] === 'string') {
      return arg[0].length
    }

    throw new Error("'len()' expects a string")
  }

  toString(): string {
    return '<native fn>'
  }
}

export class LoxTypeFn extends LoxCallable {
  arity(): number {
    return 1
  }

  call(_: Interpreter, args: LoxObject[]): LoxObject {
    let arg = args[0]
    if (arg === null) return 'nil'
    return typeof arg
  }

  toString(): string {
    return '<native fn>'
  }
}
