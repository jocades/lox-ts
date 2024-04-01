import type { Expr } from './ast'
import type { Token } from './lexer'

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

export class Parser {
  private tokens: Token[]
  private current = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private expression(): Expr {
    return this.equality()
  }

  private equality(): Expr {
    throw new Error('Method not implemented.')
  }

  private comparison(): Expr {
    throw new Error('Method not implemented.')
  }

  private term(): Expr {
    throw new Error('Method not implemented.')
  }

  private factor(): Expr {
    throw new Error('Method not implemented.')
  }

  private unary(): Expr {
    throw new Error('Method not implemented.')
  }

  private primary(): Expr {
    throw new Error('Method not implemented.')
  }
}
