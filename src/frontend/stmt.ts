import type { Expr } from './expr'
import type { Token } from './lexer'

export interface Stmt {
  accept<R>(visitor: StmtVisitor<R>): R
}

export interface StmtVisitor<R> {
  visitBlockStmt(stmt: BlockStmt): R
  visitEchoStmt(stmt: EchoStmt): R
  visitExpressionStmt(stmt: ExpressionStmt): R
  visitLetStmt(stmt: LetStmt): R
}

export class BlockStmt implements Stmt {
  constructor(public statements: Stmt[]) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitBlockStmt(this)
  }
}

export class EchoStmt implements Stmt {
  constructor(public expression: Expr) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitEchoStmt(this)
  }
}

export class ExpressionStmt implements Stmt {
  constructor(public expression: Expr) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitExpressionStmt(this)
  }
}

export class LetStmt implements Stmt {
  constructor(
    public name: Token,
    public initializer: Expr | null,
  ) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitLetStmt(this)
  }
}
