import { Lexer, TokenType, type Token } from './frontend/lexer'
import { Parser } from './frontend/parser'

export class Lox {
  static hadError = false

  static error(token: Token, message: string): void {
    this.report(
      token.line,
      token.type === TokenType.EOF ? ' at end' : ` at '${token.lexeme}'`,
      message,
    )
  }

  static report(line: number, where: string, message: string): void {
    console.error(`[line ${line}] Error${where}: ${message}`)
    this.hadError = true
  }

  static run(source: string): void {
    const tokens = new Lexer(source).lex()
    tokens.forEach((token) => console.log(token.toString()))

    const parser = new Parser(tokens)

    const expression = parser.parse()

    // Stop if there was a syntax error
    if (this.hadError) return

    console.log('[AST]', expression)
  }
}

const source = `
(2 + 2) * 2
2 + 2 * 2

`

Lox.run(source)
