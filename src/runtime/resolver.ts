import * as ast from '@/frontend/ast'
import type { Interpreter } from './interpreter'
import type { Token } from '@/frontend/lexer'
import { Lox } from '@/lox'

const enum FunctionType {
  NONE,
  FUNCTION,
}

export class Resolver implements ast.ExprVisitor<void>, ast.StmtVisitor<void> {
  private interpreter: Interpreter
  private scopes: Map<string, boolean>[] = [] // bool = whether or not we have finished resolving the variable's initializer
  private currentFunction = FunctionType.NONE

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter
  }

  visitBlockStmt(stmt: ast.BlockStmt): void {
    this.beginScope()
    this.resolve(stmt.statements)
    this.endScope()
  }

  visitEchoStmt(stmt: ast.EchoStmt): void {
    this.resolve(stmt.expression)
  }

  visitExpressionStmt(stmt: ast.ExpressionStmt): void {
    this.resolve(stmt.expression)
  }

  visitFunctionStmt(stmt: ast.FunctionStmt): void {
    this.declare(stmt.name)
    this.define(stmt.name)

    this.resolveFunction(stmt.fn, FunctionType.FUNCTION)
  }

  visitIfStmt(stmt: ast.IfStmt): void {
    this.resolve(stmt.condition)
    this.resolve(stmt.thenBranch)
    if (stmt.elseBranch !== null) this.resolve(stmt.elseBranch)
  }

  visitLetStmt(stmt: ast.LetStmt): void {
    this.declare(stmt.name)
    if (stmt.initializer !== null) {
      this.resolve(stmt.initializer)
    }
    this.define(stmt.name)
  }

  visitAssignExpr(expr: ast.AssignExpr): void {
    this.resolve(expr.value)
    this.resolveLocal(expr, expr.name)
  }

  visitBinaryExpr(expr: ast.BinaryExpr): void {
    this.resolve(expr.left)
    this.resolve(expr.right)
  }

  visitCallExpr(expr: ast.CallExpr): void {
    this.resolve(expr.callee)

    for (let arg of expr.args) {
      this.resolve(arg)
    }
  }

  visitGroupingExpr(expr: ast.GroupingExpr): void {
    this.resolve(expr.expression)
  }

  visitLiteralExpr(_expr: ast.LiteralExpr): void {}

  visitLogicalExpr(expr: ast.LogicalExpr): void {
    this.resolve(expr.left)
    this.resolve(expr.right)
  }

  visitUnaryExpr(expr: ast.UnaryExpr): void {
    this.resolve(expr.right)
  }

  visitBreakStmt(_stmt: ast.BreakStmt): void {}

  visitFunctionExpr(expr: ast.FunctionExpr): void {
    this.resolveFunction(expr, FunctionType.FUNCTION)
  }

  visitConditionalExpr(expr: ast.ConditionalExpr): void {
    this.resolve(expr.condition)
    this.resolve(expr.thenBranch)
    this.resolve(expr.elseBranch)
  }

  visitReturnStmt(stmt: ast.ReturnStmt): void {
    if (this.currentFunction === FunctionType.NONE) {
      Lox.error(stmt.keyword, 'Cannot return from top-level code.')
    }
    if (stmt.value !== null) this.resolve(stmt.value)
  }

  visitVariableExpr(expr: ast.VariableExpr): void {
    if (
      !isEmpty(this.scopes) &&
      this.scopes.at(-1)!.get(expr.name.lexeme) === false
    ) {
      Lox.error(expr.name, 'Cannot read local variable in its own initializer.')
    }

    this.resolveLocal(expr, expr.name)
  }

  visitWhileStmt(stmt: ast.WhileStmt): void {
    this.resolve(stmt.condition)
    this.resolve(stmt.body)
  }

  resolve(node: ast.Stmt[] | ast.Stmt | ast.Expr): void {
    if (Array.isArray(node)) node.forEach((stmt) => this.resolve(stmt))
    else node.accept(this)
  }

  private resolveFunction(fn: ast.FunctionExpr, type: FunctionType): void {
    let enclosingFunction = this.currentFunction
    this.currentFunction = type

    this.beginScope()
    for (let param of fn.params) {
      this.declare(param)
      this.define(param)
    }
    this.resolve(fn.body)
    this.endScope()
    this.currentFunction = enclosingFunction
  }

  private beginScope(): void {
    this.scopes.push(new Map())
  }

  private endScope(): void {
    this.scopes.pop()
  }

  private declare(name: Token): void {
    if (isEmpty(this.scopes)) return

    let scope = this.scopes.at(-1)!
    if (scope.has(name.lexeme)) {
      Lox.error(name, 'Variable with this name already declared in this scope.')
    }

    scope.set(name.lexeme, false)
  }

  private define(name: Token): void {
    if (isEmpty(this.scopes)) return
    this.scopes.at(-1)!.set(name.lexeme, true)
  }

  private resolveLocal(expr: ast.Expr, name: Token): void {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i)
        return
      }
    }
  }
}

function isEmpty<T>(arr: T[]): boolean {
  return arr.length === 0
}

// https://craftinginterpreters.com/resolving-and-binding.html#a-variable-resolution-pass
