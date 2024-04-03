import type { Interpreter } from './interpreter'

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
