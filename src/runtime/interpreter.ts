import * as ast from '@/frontend/ast'
import { Token, TokenType } from '@/frontend/lexer'
import { RuntimeError } from '@/lib/errors'
import { Lox } from '@/lox'
import type { LoxObject } from './values'
import { Environment } from './environment'

export class Interpreter
  implements ast.ExprVisitor<LoxObject>, ast.StmtVisitor<void>
{
  private environment = new Environment()

  public interpret(statements: ast.Stmt[]): void {
    try {
      for (let statement of statements) {
        this.execute(statement)
      }
    } catch (err) {
      if (err instanceof RuntimeError) Lox.runtimeError(err)
      else throw err
    }
  }

  private evaluate(expr: ast.Expr): LoxObject {
    return expr.accept(this)
  }

  private execute(stmt: ast.Stmt): void {
    stmt.accept(this)
  }

  executeBlock(statements: ast.Stmt[], environment: Environment): void {
    let previous = this.environment
    try {
      this.environment = environment

      for (let statement of statements) {
        this.execute(statement)
      }
    } finally {
      this.environment = previous
    }
  }

  visitBlockStmt(stmt: ast.BlockStmt): void {
    this.executeBlock(stmt.statements, new Environment(this.environment))
  }

  visitExpressionStmt(stmt: ast.ExpressionStmt): void {
    this.evaluate(stmt.expression)
  }

  visitEchoStmt(stmt: ast.EchoStmt): void {
    let value = this.evaluate(stmt.expression)
    console.log(this.stringify(value))
  }

  visitLetStmt(stmt: ast.LetStmt): void {
    let value: LoxObject = null
    if (stmt.initializer !== null) {
      value = this.evaluate(stmt.initializer)
    }
    this.environment.define(stmt.name.lexeme, value)
  }

  visitAssignExpr(expr: ast.AssignExpr): LoxObject {
    let value = this.evaluate(expr.value)
    this.environment.assign(expr.name, value)
    return value
  }

  visitBinaryExpr(expr: ast.BinaryExpr): LoxObject {
    let left = this.evaluate(expr.left)
    let right = this.evaluate(expr.right)

    switch (expr.operator.type) {
      case TokenType.BANG_EQUAL:
        return !this.isEqual(left, right)
      case TokenType.EQUAL_EQUAL:
        return this.isEqual(left, right)
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right)
        return (left as number) > (right as number)
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right)
        return (left as number) >= (right as number)
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right)
        return (left as number) < (right as number)
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right)
        return (left as number) <= (right as number)
      case TokenType.MINUS:
        this.checkNumberOperands(expr.operator, left, right)
        return left - right
      case TokenType.PLUS: {
        if (typeof left === 'number' && typeof right === 'number') {
          return left + right
        }
        if (typeof left === 'string' && typeof right === 'string') {
          return left + right
        }
        throw new RuntimeError(
          expr.operator,
          'Operands must be two numbers or two strings',
        )
      }
      case TokenType.SLASH: {
        this.checkNumberOperands(expr.operator, left, right)
        if (right === 0) {
          throw new RuntimeError(
            expr.operator,
            'Division by zero is not allowed.',
          )
        }
        return left / right
      }
      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right)
        return left * right
    }

    // unreachable
    return null
  }

  visitGroupingExpr(expr: ast.GroupingExpr): LoxObject {
    return this.evaluate(expr.expression)
  }

  visitLiteralExpr(expr: ast.LiteralExpr): LoxObject {
    return expr.value
  }

  visitUnaryExpr(expr: ast.UnaryExpr): LoxObject {
    let right = this.evaluate(expr.right)

    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.isTruthy(right)

      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right)
        return -right
    }

    // unreachable
    return null
  }

  visitVariableExpr(expr: ast.VariableExpr) {
    return this.environment.get(expr.name)
  }

  // -- UTIL ---

  private checkNumberOperand(operator: Token, operand: LoxObject): void {
    if (typeof operand === 'number') return
    throw new RuntimeError(operator, 'Operand must be a number.')
  }

  private checkNumberOperands(
    operator: Token,
    left: LoxObject,
    right: LoxObject,
  ) {
    if (typeof left === 'number' && typeof right === 'number') return
    throw new RuntimeError(operator, 'Operands must be numbers.')
  }

  // only false and nil are falsey values in Lox
  private isTruthy(object: LoxObject): boolean {
    if (object === null) return false
    if (typeof object === 'boolean') return object
    return true
  }

  private isEqual(x: LoxObject, y: LoxObject): boolean {
    if (x === null && y === null) return true
    if (x === null) return false

    return x === y
  }

  private stringify(object: LoxObject) {
    if (object === null) return 'nil'

    if (typeof object === 'number') {
      let text = object.toString()
      if (text.endsWith('.0')) {
        text = text.substring(0, text.length - 2)
      }
      return text
    }

    return object.toString()
  }
}
