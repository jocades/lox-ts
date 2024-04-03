import type { Expr } from './expr'
import type { Token } from './lexer'

export interface Stmt {
  accept<R>(visitor: StmtVisitor<R>): R
}

export interface StmtVisitor<R> {
  visitBlockStmt(stmt: BlockStmt): R
  visitBreakStmt(stmt: BreakStmt): R
  visitEchoStmt(stmt: EchoStmt): R
  visitExpressionStmt(stmt: ExpressionStmt): R
  visitIfStmt(stmt: IfStmt): R
  visitLetStmt(stmt: LetStmt): R
  visitWhileStmt(stmt: WhileStmt): R
}

export class BlockStmt implements Stmt {
  constructor(public statements: Stmt[]) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitBlockStmt(this)
  }
}

export class BreakStmt implements Stmt {
  public constructor(public keyword: Token) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitBreakStmt(this)
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

export class IfStmt implements Stmt {
  constructor(
    public condition: Expr,
    public thenBranch: Stmt,
    public elseBranch: Stmt | null,
  ) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitIfStmt(this)
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

export class WhileStmt implements Stmt {
  constructor(
    public condition: Expr,
    public body: Stmt,
  ) {}

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitWhileStmt(this)
  }
}
