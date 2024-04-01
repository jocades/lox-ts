import type { Expr } from './expr'

interface Stmt {
  accept<R>(visitor: StmtVisitor<R>): R
}

interface StmtVisitor<R> {
  visitEchoStmt(stmt: EchoStmt): R
  visitExpressionStmt(stmt: ExpressionStmt): R
}

class EchoStmt implements Stmt {
  constructor(public expression: Expr) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitEchoStmt(this)
  }
}

class ExpressionStmt implements Stmt {
  constructor(public expression: Expr) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitExpressionStmt(this)
  }
}
