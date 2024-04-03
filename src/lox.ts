import { AstPrinter } from './frontend/ast-printer'
import type { RuntimeError } from './lib/errors'
import { Lexer, TokenType, type Token } from './frontend/lexer'
import { Parser } from './frontend/parser'
import { Interpreter } from './runtime/interpreter'
import { Resolver } from './runtime/resolver'

export class Lox {
  private static interpreter = new Interpreter()
  static hadError = false
  static hadRuntimeError = false

  static async file(path: string): Promise<void> {
    const source = await Bun.file(path).text()
    this.run(source)

    // indicate an error in the exit code
    if (this.hadError) process.exit(65)
    if (this.hadRuntimeError) process.exit(70)
  }

  static repl(): void {
    while (true) {
      const input = prompt('[lox]>')

      if (!input) {
        continue
      }

      if (input.startsWith('.')) {
        this.handleCommand(input)
        continue
      }

      this.run(input, true)
      this.hadError = false
    }
  }

  static run(source: string, repl = false): void {
    const lexer = new Lexer(source)
    const tokens = lexer.lex()

    const parser = new Parser(tokens)
    const statements = parser.parse()

    // stop if there was a syntax error
    if (this.hadError) return

    const resolver = new Resolver(this.interpreter)
    resolver.resolve(statements)

    // stop if there was a resolution error
    if (this.hadError) return

    this.interpreter.interpret(statements, { repl })
  }

  // --- ERROR HANDLING ---

  static error(token: Token, message: string): void {
    this.report(
      token.line,
      token.type === TokenType.EOF ? 'at end' : `at '${token.lexeme}'`,
      message,
    )
  }

  private static report(line: number, where: string, message: string): void {
    console.log(`[line ${line}] Error ${where}: ${message}`)
    this.hadError = true
  }

  static runtimeError(error: RuntimeError): void {
    console.log(error.message, `\n[line ${error.token.line}]`)
    this.hadRuntimeError = true
  }

  private static handleCommand(input: string): void {
    switch (input) {
      case '.exit':
        process.exit(0)
      default:
        console.log(`Unknown command '${input}'`)
    }
  }
}

// const source = `2 + 2 * 2 == 8`
//
// Lox.run(source)
