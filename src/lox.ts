import { AstPrinter } from './frontend/ast-printer'
import type { RuntimeError } from './lib/errors'
import { Lexer, TokenType, type Token } from './frontend/lexer'
import { Parser } from './frontend/parser'
import { Interpreter } from './runtime/interpreter'
import { Resolver } from './runtime/resolver'
import { Debug } from './lib/config'
import type { Stmt } from './frontend/stmt'

export class Lox {
  private static interpreter = new Interpreter()
  static hadError = false
  static hadRuntimeError = false

  static async file(
    path: string,
    // opts: { output: boolean } = { output: false },
  ): Promise<void> {
    const source = await Bun.file(path).text()
    await this.run(source)

    // indicate an error in the exit code
    if (this.hadError) process.exit(65)
    if (this.hadRuntimeError) process.exit(70)
  }

  static async repl(): Promise<void> {
    while (true) {
      const input = prompt('[lox]>')

      if (!input) {
        continue
      }

      if (input.startsWith('.')) {
        this.handleCommand(input)
        continue
      }

      await this.run(input, true)
      this.hadError = false
    }
  }

  static async run(source: string, repl = false): Promise<void> {
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

    if (Debug.AST) console.log('[AST]', statements)
    if (Debug.JSON) await this.writeAst(statements)

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

      case '.ast':
        Debug.AST = !Debug.AST
        console.log(`AST is now ${Debug.AST ? 'enabled' : 'disabled'}`)
        break

      // case '.env':
      //   console.log(env)
      //   break

      default:
        console.log(`Unknown command '${input}'`)
    }
  }

  private static async writeAst(tree: Stmt[]) {
    await Bun.write('test.ast.json', JSON.stringify(tree, null, 2))
  }
}

// const source = `2 + 2 * 2 == 8`
//
// Lox.run(source)
