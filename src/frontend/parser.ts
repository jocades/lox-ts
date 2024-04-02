import {
  BinaryExpr,
  type Expr,
  GroupingExpr,
  LiteralExpr,
  UnaryExpr,
  type Stmt,
  EchoStmt,
  ExpressionStmt,
  LetStmt,
  VariableExpr,
  AssignExpr,
  BlockStmt,
  IfStmt,
  LogicalExpr,
  WhileStmt,
} from './ast'
import { ParseError } from '../lib/errors'
import { Lexer, Token, TokenType } from './lexer'
import { Lox } from '../lox'

// --- LOX EXPRESSIONS (RECURSIVE DESCENT PARSING) --- https://en.wikipedia.org/wiki/Recursive_descent_parser
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
// program        → declaration* EOF ;
//
// declaration    → letDecl
//                | statement ;
//
// statement      → exprStmt
//                | ifStmt
//                | printStmt
//                | whileStmt
//                | block ;
//
// whileStmt      → "while" "(" expression ")" statement ;
// ifStmt         → "if" "(" expression ")" statement ( "else" statement )? ;
// block          → "{" declaration* "}" ;
// exprStmt       → expression ";" ;
// letDecl        → "let" IDENTIFIER ( "=" expression )? ";" ;
// printStmt      → "echo" expression ";" ;
//
// expression     → assignment ;
// assignment     → IDENTIFIER "=" assignment
//                | logic_or ;
// logical_or     → logical_and ( "or" logical_and )* ;
// logical_and    → equality ( "and" equality )* ;
// equality       → comparison ( ( "!=" | "==" ) comparison )* ;
// comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
// term           → factor ( ( "-" | "+" ) factor )* ;
// factor         → unary ( ( "/" | "*" ) unary )* ;
// unary          → ( "!" | "-" ) unary
//                | primary ;
// primary        → NUMBER | STRING | "true" | "false" | "nil"
//                | "(" expression ")"
//                | IDENTIFIER ;
//

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
  public parse(): Stmt[] {
    let statements: Stmt[] = []

    while (!this.eof()) {
      try {
        statements.push(this.declaration())
      } catch (err) {
        if (err instanceof ParseError) this.synchronize()
        else throw err
      }
    }

    return statements
  }

  /**
   * expression     → assignment ;
   */
  private expression(): Expr {
    return this.assignment()
  }

  /**
   * declaration    → letDecl
   *                | statement ;
   */
  private declaration(): Stmt {
    if (this.match(TokenType.LET)) return this.letDeclaration()

    return this.statement()
  }

  /**
   * statement      → exprStmt
   *                | ifStmt
   *                | echoStmt
   *                | whileStmt
   *                | block ;
   */
  private statement(): Stmt {
    if (this.match(TokenType.IF)) return this.ifStatement()
    if (this.match(TokenType.ECHO)) return this.echoStatement()
    if (this.match(TokenType.WHILE)) return this.whileStatement()
    if (this.match(TokenType.LBRACE)) return new BlockStmt(this.block())

    return this.expressionStatement()
  }

  /**
   * ifStmt         → "if" "(" expression ")" statement ( "else" statement )? ;
   */
  private ifStatement(): Stmt {
    this.consume(TokenType.LPAREN, "Expected '(' after 'if'.")
    let condition = this.expression()
    this.consume(TokenType.RPAREN, "Expected ')' after if condition.")

    let thenBranch = this.statement()
    let elseBranch: Stmt | null = null

    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement()
    }

    return new IfStmt(condition, thenBranch, elseBranch)
  }

  private echoStatement(): Stmt {
    let value = this.expression()
    this.consume(TokenType.SEMICOLON, "Expected ';' after value.")
    return new EchoStmt(value)
  }

  /**
   * letDecl        → "let" IDENTIFIER ( "=" expression )? ";" ;
   */
  private letDeclaration(): Stmt {
    let name = this.consume(TokenType.IDENTIFIER, 'Expected variable name.')

    let initializer: Expr | null = null
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression()
    }

    this.consume(
      TokenType.SEMICOLON,
      "Expected ';' after variable declaration.",
    )

    return new LetStmt(name, initializer)
  }

  /**
   * whileStmt      → "while" "(" expression ")" statement ;
   */
  private whileStatement(): Stmt {
    this.consume(TokenType.LPAREN, "Expected '(' after 'while'.")
    let condition = this.expression()
    this.consume(TokenType.RPAREN, "Expected ')' after condition.")
    let body = this.statement()

    return new WhileStmt(condition, body)
  }

  /**
   * block          → "{" declaration* "}" ;
   */
  private block(): Stmt[] {
    let statements: Stmt[] = []

    while (!this.check(TokenType.RBRACE) && !this.eof()) {
      statements.push(this.declaration())
    }

    this.consume(TokenType.RBRACE, "Expected '}' after block.")
    return statements
  }

  /**
   * exprStmt       → expression ";" ;
   * a statement that evaluates an expression
   */
  private expressionStatement(): Stmt {
    let expr = this.expression()
    this.consume(TokenType.SEMICOLON, "Expected ';' after expression.")
    return new ExpressionStmt(expr)
  }

  /**
   * assignment     → IDENTIFIER "=" assignment
   *                | logic_or ;
   */
  private assignment(): Expr {
    let expr = this.or()

    if (this.match(TokenType.EQUAL)) {
      let equals = this.prev()
      let value = this.assignment()

      if (expr instanceof VariableExpr) {
        let name = expr.name
        return new AssignExpr(name, value)
      }

      this.error(equals, 'Invalid assignment target.')
    }

    return expr
  }

  /**
   * logical_or     → logical_and ( "or" logical_and )* ;
   */
  private or(): Expr {
    let expr = this.and()

    while (this.match(TokenType.OR)) {
      let operator = this.prev()
      let right = this.and()
      expr = new LogicalExpr(expr, operator, right)
    }

    return expr
  }

  /**
   * logical_and    → equality ( "and" equality )* ;
   */

  private and(): Expr {
    let expr = this.equality()

    while (this.match(TokenType.AND)) {
      let operator = this.prev()
      let right = this.equality()
      expr = new LogicalExpr(expr, operator, right)
    }

    return expr
  }

  /**
   * equality       → comparison ( ( "!=" | "==" ) comparison )* ;
   */
  private equality(): Expr {
    let expr = this.comparison()

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
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
   * primary        → NUMBER | STRING | "true" | "false" | "nil"
   *                | "(" expression ")"
   *                | IDENTIFIER ;
   */
  private primary(): Expr {
    if (this.match(TokenType.FALSE)) return new LiteralExpr(false)
    if (this.match(TokenType.TRUE)) return new LiteralExpr(true)
    if (this.match(TokenType.NIL)) return new LiteralExpr(null)

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new LiteralExpr(this.prev().literal)
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return new VariableExpr(this.prev())
    }

    if (this.match(TokenType.LPAREN)) {
      let expr = this.expression()
      this.consume(TokenType.RPAREN, "Expected ')' after expression.")
      return new GroupingExpr(expr)
    }

    throw this.error(this.peek(), 'Expected expression.')
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

  private error(token: Token, message: string): ParseError {
    Lox.error(token, message)
    return new ParseError(
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
  let source = `(2 + 2) * 2`
  let tokens = new Lexer(source).lex()
  // console.log('TOKENS', tokens.map(String))

  let parser = new Parser(tokens)
  let expr = parser.parse()
  console.log('EXPR', expr)

  // let printer = new AstPrinter()
  // console.log(printer.print(expr!))
}

// test()
