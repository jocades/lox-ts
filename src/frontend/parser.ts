import {
  BinaryExpr,
  GroupingExpr,
  LiteralExpr,
  UnaryExpr,
  type Expr,
} from './ast'
import { AstPrinter } from './ast-printer'
import { SyntaxError } from './errors'
import { Lexer, TokenType, type Token } from './lexer'

// --- LOX EXPRESSIONS (RECURSIVE DESCENT PARSING) ---
// A recursive descent parser is a literal translation of the grammar’s rules
// straight into imperative code. Each rule becomes a function. The body of the
// rule translates to code roughly like:

// Grammar Notation  Code
// ---------------   ----
// Terminals         Code to match and consume a token.
// Nonterminals      Call to that rule’s function.
// |                 if or switch statement.
// * or +            while or for loop.
// ?                 if statement.

// GRAMMAR RULES:
// -------------
// expression     → equality ;
// equality       → comparison ( ( "!=" | "==" ) comparison )* ;
// comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
// term           → factor ( ( "-" | "+" ) factor )* ;
// factor         → unary ( ( "/" | "*" ) unary )* ;
// unary          → ( "!" | "-" ) unary
//                | primary ;
// primary        → NUMBER | STRING | "true" | "false" | "nil"
//                | "(" expression ")" ;

let hadError = false

export class Parser {
  private tokens: Token[]
  private current = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  /**
   * Parses the tokens into an expression
   * @returns the parsed expression
   */
  public parse(): Expr | null {
    try {
      return this.expression()
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.error(`[line ${err.line}] SyntaxError: ${err.message}`)
      }
      return null
    }
  }

  /**
   * expression     → equality ;
   */
  private expression(): Expr {
    return this.equality()
  }

  /**
   * equality       → comparison ( ( "!=" | "==" ) comparison )* ;
   */
  private equality(): Expr {
    let expr = this.comparison()

    while (this.match(TokenType.EQUAL, TokenType.EQUAL_EQUAL)) {
      let operator = this.prev()
      let right = this.comparison()
      expr = new BinaryExpr(expr, operator, right)
    }

    return expr
  }

  /**
   * comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
   */
  private comparison(): Expr {
    let expr = this.term()

    while (
      this.match(
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL,
      )
    ) {
      let operator = this.prev()
      let right = this.term()
      expr = new BinaryExpr(expr, operator, right)
    }

    return expr
  }

  /**
   * term           → factor ( ( "-" | "+" ) factor )* ;
   */
  private term(): Expr {
    let expr = this.factor()

    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      let operator = this.prev()
      let right = this.factor()
      expr = new BinaryExpr(expr, operator, right)
    }

    return expr
  }

  /**
   * factor         → unary ( ( "/" | "*" ) unary )* ;
   */
  private factor(): Expr {
    let expr = this.unary()

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      let operator = this.prev()
      let right = this.unary()
      expr = new BinaryExpr(expr, operator, right)
    }

    return expr
  }

  /**
   * unary          → ( "!" | "-" ) unary | primary ;
   */
  private unary(): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      let operator = this.prev()
      let right = this.unary()
      return new UnaryExpr(operator, right)
    }

    return this.primary()
  }

  /**
   * primary        → NUMBER | STRING | "true" | "false" | "nil" | "(" expression ")" ;
   */
  private primary(): Expr {
    if (this.match(TokenType.FALSE)) return new LiteralExpr(false)
    if (this.match(TokenType.TRUE)) return new LiteralExpr(true)
    if (this.match(TokenType.NIL)) return new LiteralExpr(null)

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new LiteralExpr(this.prev().literal)
    }

    if (this.match(TokenType.LPAREN)) {
      let expr = this.expression()
      this.consume(TokenType.RPAREN, 'Expect ")" after expression.')
      return new GroupingExpr(expr)
    }

    throw this.error(this.peek(), 'Expect expression.')
  }

  // --- UTIL ---

  /** @returns true if the current type matches the expected type and advances the cursor */
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance()
        return true
      }
    }
    return false
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance()
    }
    throw this.error(this.peek(), message)
  }

  private check(type: TokenType): boolean {
    if (this.eof()) return false
    return this.peek().type == type
  }

  private advance(): Token {
    if (!this.eof()) this.current++
    return this.prev()
  }

  private eof(): boolean {
    return this.peek().type == TokenType.EOF
  }

  private peek(): Token {
    return this.tokens[this.current]
  }

  private prev(): Token {
    return this.tokens[this.current - 1]
  }

  // --- ERRORS ---

  private error(token: Token, message: string): SyntaxError {
    return new SyntaxError(
      message,
      token.line,
      token.type === TokenType.EOF ? 'at end' : `at '${token.lexeme}'`,
    )
  }

  /**
   * Discard tokens until we find a statemnt boundary to recover from any syntax error
   */
  private synchronize(): void {
    this.advance()

    while (!this.eof()) {
      if (this.prev().type == TokenType.SEMICOLON) {
        return
      }

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.ECHO:
        case TokenType.FN:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.LET:
        case TokenType.WHILE:
        case TokenType.RETURN:
          return
      }

      this.advance()
    }
  }
}

function test() {
  let source = `-2 + 2 * 2`
  let tokens = new Lexer(source).lex()
  console.log('TOKENS', tokens.map(String))

  let parser = new Parser(tokens)
  let expr = parser.parse()
  console.log('EXPR', expr)

  let printer = new AstPrinter()
  console.log(printer.print(expr!))
}

test()
