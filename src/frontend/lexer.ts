// prettier-ignore
export const enum TokenType {
  // Single-character tokens.
  LPAREN, RPAREN, LBRACE, RBRACE,
  CARET, COLON, COMMA, DOT, MINUS, PLUS,
  QUESTION, SEMICOLON, SLASH, STAR,

  // One or two character tokens.
  BANG, BANG_EQUAL,
  EQUAL, EQUAL_EQUAL,
  GREATER, GREATER_EQUAL,
  LESS, LESS_EQUAL,

  // Literals.
  IDENTIFIER, STRING, NUMBER,

  // Keywords.
  AND, BREAK, CLASS, ECHO, ELSE, FALSE,
  FN, FOR, IF, LET, NIL, OR, RETURN,
  SUPER, THIS, TRUE, WHILE,

  EOF,
}

/**
 * Lookup table for keywords and their corresponding token types
 */
const KEYWORDS: Record<string, TokenType> = {
  and: TokenType.AND,
  break: TokenType.BREAK,
  class: TokenType.CLASS,
  echo: TokenType.ECHO,
  else: TokenType.ELSE,
  false: TokenType.FALSE,
  for: TokenType.FOR,
  fn: TokenType.FN,
  if: TokenType.IF,
  let: TokenType.LET,
  nil: TokenType.NIL,
  or: TokenType.OR,
  return: TokenType.RETURN,
  super: TokenType.SUPER,
  this: TokenType.THIS,
  true: TokenType.TRUE,
  while: TokenType.WHILE,
}

/**
 * Represents a single token from the source code
 */
export class Token {
  constructor(
    public type: TokenType,
    public lexeme: string,
    public literal: any,
    public line: number,
    public column: number,
  ) {}

  // public toString(): string {
  //   return `type: ${this.type}, lexeme: ${this.lexeme}, literal: ${this.literal}, line: ${this.line}`
  // }
}

export class Lexer {
  private source: string
  private tokens: Token[] = []
  private start = 0
  private cursor = 0
  private line = 1

  constructor(source: string) {
    this.source = source
  }

  public lex(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.cursor
      this.scan()
    }
    this.tokens.push(new Token(TokenType.EOF, '', null, this.line, 0))

    return this.tokens
  }

  private scan() {
    const c = this.eat() // consume the current character and advance the cursor

    switch (c) {
      // single character tokens
      case '(':
        this.push(TokenType.LPAREN)
        break
      case ')':
        this.push(TokenType.RPAREN)
        break
      case '{':
        this.push(TokenType.LBRACE)
        break
      case '}':
        this.push(TokenType.RBRACE)
        break
      case ',':
        this.push(TokenType.COMMA)
        break
      case '^':
        this.push(TokenType.CARET)
        break
      case ':':
        this.push(TokenType.COLON)
        break
      case '.':
        this.push(TokenType.DOT)
        break
      case '-':
        this.push(TokenType.MINUS)
        break
      case '+':
        this.push(TokenType.PLUS)
        break
      case '?':
        this.push(TokenType.QUESTION)
        break
      case ';':
        this.push(TokenType.SEMICOLON)
        break
      case '*':
        this.push(TokenType.STAR)
        break

      // one or two character tokens
      case '!':
        this.push(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG)
        break
      case '=':
        this.push(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL)
        break
      case '<':
        this.push(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS)
        break
      case '>':
        this.push(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER)
        break
      case '/':
        if (this.match('/')) {
          // a comment goes until the end of the line
          while (this.at !== '\n' && !this.isAtEnd()) this.advance()
        } else {
          this.push(TokenType.SLASH)
        }
        break

      case ' ':
      case '\r':
      case '\t':
        // ignore whitespace
        break

      case '\n':
        this.line++
        break

      case '"':
      case "'":
        this.string(c)
        break

      default:
        if (isDigit(c)) this.number()
        else if (isAlpha(c)) this.identifier()
        else console.log(`Unexpected character: ${c}`)
    }
  }

  /** Consumes a string literal */
  private string(quote: string) {
    while (this.at !== quote && !this.isAtEnd()) {
      // allow multiline strings
      if (this.at === '\n') this.line++
      this.advance()
    }

    if (this.isAtEnd()) {
      console.error('Unterminated string')
      return
    }

    // consume the closing quote
    this.advance()

    // trim the surrounding quotes
    const value = this.source.substring(this.start + 1, this.cursor - 1)
    this.push(TokenType.STRING, value)
  }

  /** Consumes an identifier */
  private identifier() {
    while (isAlphaNumeric(this.at)) this.advance()

    const text = this.source.substring(this.start, this.cursor)
    const type = KEYWORDS[text] ?? TokenType.IDENTIFIER

    this.push(type)
  }

  /** Consumes a numeric literal */
  private number() {
    while (isDigit(this.at)) this.advance()

    // look for a fractional part
    if (this.at === '.' && isDigit(this.next)) {
      // consume the '.'
      this.advance()

      while (isDigit(this.at)) this.advance()
    }

    this.push(
      TokenType.NUMBER,
      parseFloat(this.source.substring(this.start, this.cursor)),
    )
  }

  private isAtEnd(): boolean {
    return this.cursor >= this.source.length
  }

  /** Advances the cursor by one */
  private advance(): void {
    this.cursor++
  }

  /** @retuns the char at the current index */
  private get at(): string {
    if (this.isAtEnd()) {
      return '\0'
    }
    return this.source[this.cursor]
  }

  /** @returns the char at the current index and advances the cursor by one */
  private eat(): string {
    return this.source[this.cursor++]
  }

  /** @returns true if the current char matches the expected char and advances the cursor */
  private match(expected: string): boolean {
    if (this.isAtEnd() || this.at !== expected) {
      return false
    }
    this.advance()
    return true
  }

  /** @returns the next char in the iterable */
  private get next(): string {
    if (this.cursor + 1 >= this.source.length) {
      return '\0'
    }
    return this.source[this.cursor + 1]
  }

  /** Pushes a new token into the list */
  private push(type: TokenType, literal: any = null) {
    const raw = this.source.substring(this.start, this.cursor)
    const column = this.cursor - this.source.lastIndexOf('\n', this.start) - 1
    this.tokens.push(new Token(type, raw, literal, this.line, column))
  }
}

export function isDigit(c: string): boolean {
  return /^[0-9]$/.test(c)
}

export function isAlpha(c: string): boolean {
  // accept special chars: $, _, @, and #
  return /^[a-zA-Z_$@#]$/.test(c)
}

export function isAlphaNumeric(c: string): boolean {
  return isAlpha(c) || isDigit(c)
}

export function isWhitespace(c: string): boolean {
  return /^[ \t\n]$/.test(c)
}
