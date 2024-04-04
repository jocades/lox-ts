import type { LoxObject } from '@/runtime/values'
import { Token } from './lexer'
import type { Stmt } from './stmt'

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
  visitAssignExpr(expr: AssignExpr): R
  visitBinaryExpr(expr: BinaryExpr): R
  visitCallExpr(expr: CallExpr): R
  visitConditionalExpr(expr: ConditionalExpr): R
  visitFunctionExpr(expr: FunctionExpr): R
  visitGetExpr(expr: GetExpr): R
  visitGroupingExpr(expr: GroupingExpr): R
  visitLiteralExpr(expr: LiteralExpr): R
  visitLogicalExpr(expr: LogicalExpr): R
  visitSetExpr(expr: SetExpr): R
  visitUnaryExpr(expr: UnaryExpr): R
  visitVariableExpr(expr: VariableExpr): R
}

export class AssignExpr implements Expr {
  constructor(
    public name: Token,
    public value: Expr,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitAssignExpr(this)
  }
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

export class CallExpr implements Expr {
  constructor(
    public callee: Expr,
    public paren: Token,
    public args: Expr[],
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitCallExpr(this)
  }
}

// ternary operator
export class ConditionalExpr implements Expr {
  constructor(
    public condition: Expr,
    public thenBranch: Expr,
    public elseBranch: Expr,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitConditionalExpr(this)
  }
}

// allows for anonymous functions
export class FunctionExpr implements Expr {
  constructor(
    public params: Token[],
    public body: Stmt[],
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitFunctionExpr(this)
  }
}

export class GetExpr implements Expr {
  constructor(
    public object: Expr,
    public name: Token,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    visitor.visitGetExpr(this)
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

export class LogicalExpr implements Expr {
  operator: Token
  left: Expr
  right: Expr

  constructor(left: Expr, operator: Token, right: Expr) {
    this.left = left
    this.operator = operator
    this.right = right
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitLogicalExpr(this)
  }
}

export class UnaryExpr implements Expr {
  constructor(
    public operator: Token,
    public right: Expr,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitUnaryExpr(this)
  }
}

export class SetExpr implements Expr {
  constructor(
    public object: Expr,
    public name: Token,
    public value: Expr,
  ) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitSetExpr(this)
  }
}

export class VariableExpr implements Expr {
  constructor(public name: Token) {}

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitVariableExpr(this)
  }
}
