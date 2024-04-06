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
  BreakStmt,
  CallExpr,
  FunctionStmt,
  ReturnStmt,
  FunctionExpr,
  ConditionalExpr,
  ClassStmt,
  GetExpr,
  SetExpr,
  ThisExpr,
  SuperExpr,
} from './ast'
import { ParseError } from '../lib/errors'
import { Token, TokenType } from './lexer'
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

// GRAMMAR RULES (Backus-Naur form | BNF):
// -------------
// program        → declaration* EOF ;
//
// declaration    → classDecl
//                | fnDecl,
//                | letDecl
//                | statement ;
//
// classDecl      → "class" IDENTIFIER ( "<" IDENTIFIER )?
//                | "{" function* "}" ;
// fnDecl         → "fn" function ;
// function       → IDENTIFIER "(" parameters? ")" block ;
// parameters     → IDENTIFIER ( "," IDENTIFIER )* ;
// letDecl        → "let" IDENTIFIER ( "=" expression )? ";" ;
//
// statement      → exprStmt
//                | forStmt
//                | ifStmt
//                | printStmt
//                | returnStmt
//                | whileStmt
//                | block ;
//
//
// returnStmt     → "return" expression? ";" ;
// forStmt        → "for "("  ( varDecl | exprStmt | ";" )
//                  expression? ";"
//                  expression? statement ;
// whileStmt      → "while" "(" expression ")" statement ;
// ifStmt         → "if" "(" expression ")" statement ( "else" statement )? ;
// block          → "{" declaration* "}" ;
// printStmt      → "echo" expression ";" ;
// exprStmt       → expression ";" ;
//
// expression     → assignment ;
// assignment     → IDENTIFIER "=" assignment
//                | logical_or ;
// logical_or     → logical_and ( "or" logical_and )* ;
// logical_and    → conditional ( "and" conditional )* ;
// conditional    → equality ( "?" expression ":" conditional )? ;
// equality       → comparison ( ( "!=" | "==" ) comparison )* ;
// comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
// term           → factor ( ( "-" | "+" ) factor )* ;
// factor         → unary ( ( "/" | "*" ) unary )* ;
// unary          → ( "!" | "-" ) unary
//                | call ;
// call           → primary ( "(" arguments? ")" | "." IDENTIFIER )* ;
// arguments      → expression ( "," expression )* ;
// primary        → "true" | "false" | "nil" | "this"
//                | NUMBER | STRING | IDENTIFIER | "(" expression ")"
//                | "super" "." IDENTIFIER ;
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
    if (this.match(TokenType.CLASS)) return this.classDeclaration()

    if (this.check(TokenType.FN) && this.checkNext(TokenType.IDENTIFIER)) {
      this.consume(TokenType.FN, 'Expected function declaration.')
      return this.fnDeclaration('function')
    }

    if (this.match(TokenType.LET)) return this.letDeclaration()

    return this.statement()
  }

  /**
   * classDecl      → "class" IDENTIFIER "{" function* "}" ;
   */
  private classDeclaration(): Stmt {
    let name = this.consume(TokenType.IDENTIFIER, 'Expected class name.')

    let superclass: VariableExpr | null = null
    if (this.match(TokenType.LESS)) {
      this.consume(TokenType.IDENTIFIER, 'Expected superclass name.')
      superclass = new VariableExpr(this.prev())
    }

    this.consume(TokenType.LBRACE, "Expected '{' before class body.")

    let methods: FunctionStmt[] = []

    while (!this.check(TokenType.RBRACE) && !this.eof()) {
      methods.push(this.fnDeclaration('method'))
    }
    this.consume(TokenType.RBRACE, "Expected '}' after class body.")

    return new ClassStmt(name, superclass, methods)
  }

  /**
   * statement      → exprStmt
   *                | ifStmt
   *                | echoStmt
   *                | whileStmt
   *                | block ;
   */
  private statement(): Stmt {
    if (this.match(TokenType.FOR)) return this.forStatement()
    if (this.match(TokenType.IF)) return this.ifStatement()
    if (this.match(TokenType.ECHO)) return this.echoStatement()
    if (this.match(TokenType.RETURN)) return this.returnStatement()
    if (this.match(TokenType.WHILE)) return this.whileStatement()
    if (this.match(TokenType.BREAK)) return this.breakStatement()
    if (this.match(TokenType.LBRACE)) return new BlockStmt(this.block())

    return this.expressionStatement()
  }

  /**
   * forStmt        → "for" "(" ( varDecl | exprStmt | ";" )
   *                 expression? ";"
   *                 expression? ")" statement ;
   *
   * @example for (let i = 0; i < 10; i = i + 1) echo i;
   */
  private forStatement(): Stmt {
    this.consume(TokenType.LPAREN, "Expected '(' after 'for'.")

    let initializer: Stmt | null
    if (this.match(TokenType.SEMICOLON)) {
      initializer = null
    } else if (this.match(TokenType.LET)) {
      initializer = this.letDeclaration()
    } else {
      initializer = this.expressionStatement()
    }

    let condition: Expr | null = null
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression()
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after looop condition.")
    let increment: Expr | null = null
    if (!this.check(TokenType.RPAREN)) {
      increment = this.expression()
    }
    this.consume(TokenType.RPAREN, "Expected, ')' after for clauses.")

    let body = this.statement()

    // desugaring syntactic sugar so that the interpreter already recognizes the nodes.
    // for (let i = 0; i < 10; i = i + 1) echo i;
    // same as:
    // {
    //   let i = 0;
    //   while (i < 10) {
    //     echo i;
    //     i = i + 1;
    //   }
    // }
    if (increment !== null) {
      body = new BlockStmt([body, new ExpressionStmt(increment)])
    }

    if (condition === null) condition = new LiteralExpr(true)
    body = new WhileStmt(condition, body)

    if (initializer !== null) {
      body = new BlockStmt([initializer, body])
    }

    return body
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
   * returnStmt     → "return" expression? ";" ;
   */
  private returnStatement(): Stmt {
    let keyword = this.prev()
    let value: Expr | null = null

    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression()
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after return value.")

    return new ReturnStmt(keyword, value)
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

  private breakStatement(): Stmt {
    this.consume(TokenType.SEMICOLON, "Expected ';' after 'break'.")
    return new BreakStmt(this.prev())
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
   * fnDecl        → "fn" function ;
   * function      → IDENTIFIER "(" parameters? ")" block ;
   * parameters    → IDENTIFIER ( "," IDENTIFIER )* ;
   */
  private fnDeclaration(kind: string): FunctionStmt {
    let name = this.consume(
      TokenType.IDENTIFIER,
      `Expected ${kind} after name.`,
    )
    return new FunctionStmt(name, this.fnBody(kind))
  }

  private fnBody(kind: string): FunctionExpr {
    this.consume(TokenType.LPAREN, `Expected '(' after ${kind} name.`)

    let parameters: Token[] = []
    if (!this.check(TokenType.RPAREN)) {
      do {
        if (parameters.length >= 255) {
          this.error(this.peek(), 'Cannot have more than 255 parameters.')
        }
        parameters.push(
          this.consume(TokenType.IDENTIFIER, 'Expected parameter name.'),
        )
      } while (this.match(TokenType.COMMA))
    }
    this.consume(TokenType.RPAREN, "Expected ')' after parameters.")

    this.consume(TokenType.LBRACE, `Expected '{' before ${kind} body.`)
    let body = this.block()

    return new FunctionExpr(parameters, body)
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
      } else if (expr instanceof GetExpr) {
        return new SetExpr(expr.object, expr.name, value)
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
   * logical_and    → conditional ( "and" conditional )* ;
   */
  private and(): Expr {
    let expr = this.conditional()

    while (this.match(TokenType.AND)) {
      let operator = this.prev()
      let right = this.conditional()
      expr = new LogicalExpr(expr, operator, right)
    }

    return expr
  }

  /**
   * conditional    → equality ( "?" expression ":" conditional )? ;
   */
  private conditional(): Expr {
    let expr = this.equality()

    while (this.match(TokenType.QUESTION)) {
      // like an if stmt bun the branches produce values
      let thenBranch = this.expression()
      this.consume(
        TokenType.COLON,
        "Expected ':' after then branch of conditional expression.",
      )
      let elseBranch = this.expression()
      expr = new ConditionalExpr(expr, thenBranch, elseBranch)
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
   * unary          → ( "!" | "-" ) unary | call ;
   */
  private unary(): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      let operator = this.prev()
      let right = this.unary()
      return new UnaryExpr(operator, right)
    }

    return this.call()
  }

  /**
   * call           → primary ( "(" arguments? ")" | "." IDENTIFIER )* ;
   */
  private call(): Expr {
    let expr = this.primary()

    while (true) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr)
      } else if (this.match(TokenType.DOT)) {
        let name = this.consume(
          TokenType.IDENTIFIER,
          "Expected property name after '.'.",
        )
        expr = new GetExpr(expr, name)
      } else {
        break
      }
    }

    return expr
  }

  private finishCall(callee: Expr): Expr {
    let args: Expr[] = []

    if (!this.check(TokenType.RPAREN)) {
      do {
        if (args.length >= 255) {
          this.error(this.peek(), 'Cannot have more than 255 arguments.')
        }
        args.push(this.expression())
      } while (this.match(TokenType.COMMA))
    }

    let paren = this.consume(TokenType.RPAREN, "Expected ')' after arguments.")

    return new CallExpr(callee, paren, args)
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

    if (this.match(TokenType.THIS)) return new ThisExpr(this.prev())

    if (this.match(TokenType.IDENTIFIER)) {
      return new VariableExpr(this.prev())
    }

    if (this.match(TokenType.SUPER)) {
      let keyword = this.prev()
      this.consume(TokenType.DOT, "Expected '.' after 'super'.")
      let method = this.consume(
        TokenType.IDENTIFIER,
        'Expected superclass method name.',
      )
      return new SuperExpr(keyword, method)
    }

    // separate from fnDecl to allow lambda functions
    if (this.match(TokenType.FN)) {
      return this.fnBody('function')
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

  private checkNext(type: TokenType): boolean {
    if (this.eof()) return false
    if (this.tokens[this.current + 1].type == TokenType.EOF) return false
    return this.tokens[this.current + 1].type == type
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
