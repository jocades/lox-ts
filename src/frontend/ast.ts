import type { LoxObject } from '../runtime/values'
import { Token } from './lexer'

// Backus-Naur form (BNF) grammar for the AST nodes of the language.

// Each rule is a name, followed by an arrow (→),
// followed by a sequence of symbols,
// and finally ending with a semicolon (;).
// Terminals are quoted strings, and nonterminals are lowercase words.

// Using that, here’s a grammar for breakfast menus:

// breakfast  → protein "with" breakfast "on the side" ;
// breakfast  → protein ;
// breakfast  → bread ;
//
// protein    → crispiness "crispy" "bacon" ;
// protein    → "sausage" ;
// protein    → cooked "eggs" ;
//
// crispiness → "really" ;
// crispiness → "really" crispiness ;
//
// cooked     → "scrambled" ;
// cooked     → "poached" ;
// cooked     → "fried" ;
//
// bread      → "toast" ;
// bread      → "biscuits" ;
// bread      → "English muffin" ;

// The grammar above is a context-free grammar (CFG).
// It’s called context-free because the left-hand side of each rule is a single nonterminal.
// We can rewrite the grammar to be more concise:

// breakfast → protein ( "with" breakfast "on the side" )?
//           | bread ;
//
// protein   → "really"+ "crispy" "bacon"
//           | "sausage"
//           | ( "scrambled" | "poached" | "fried" ) "eggs" ;
//
// bread     → "toast" | "biscuits" | "English muffin" ;

// --- LOX EXPRESSIONS ---

// expression     → literal
//                | unary
//                | binary
//                | grouping ;
//
// literal        → NUMBER | STRING | "true" | "false" | "nil" ;
// grouping       → "(" expression ")" ;
// unary          → ( "-" | "!" ) expression ;
// binary         → expression operator expression ;
// operator       → "==" | "!=" | "<" | "<=" | ">" | ">="
//                | "+"  | "-"  | "*" | "/" ;

export interface Expr {
  accept<R>(visitor: ExprVisitor<R>): R
}

export interface ExprVisitor<R> {
  visitBinaryExpr(expr: BinaryExpr): R
  visitGroupingExpr(expr: GroupingExpr): R
  visitLiteralExpr(expr: LiteralExpr): R
  visitUnaryExpr(expr: UnaryExpr): R
}

export class BinaryExpr implements Expr {
  operator: Token
  left: Expr
  right: Expr

  constructor(left: Expr, operator: Token, right: Expr) {
    this.left = left
    this.operator = operator
    this.right = right
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitBinaryExpr(this)
  }
}

export class GroupingExpr implements Expr {
  constructor(public expression: Expr) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitGroupingExpr(this)
  }
}

export class LiteralExpr implements Expr {
  constructor(public value: LoxObject) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitLiteralExpr(this)
  }
}

export class UnaryExpr implements Expr {
  operator: Token
  right: Expr

  constructor(operator: Token, right: Expr) {
    this.operator = operator
    this.right = right
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitUnaryExpr(this)
  }
}
