import { RuntimeError } from '@/lib/errors'
import { LoxCallable, type LoxObject } from './values'
import type { Environment } from './environment'
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
      return (arg[0] as string).length
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

  call(_: Interpreter, arg: LoxObject[]): LoxObject {
    return arg[0] === null ? 'nil' : typeof arg[0]
  }

  toString(): string {
    return '<native fn>'
  }
}
