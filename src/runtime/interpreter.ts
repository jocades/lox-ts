import * as ast from '@/frontend/ast'
import { Token, TokenType } from '@/frontend/lexer'
import { RuntimeError } from '@/lib/errors'
import { Lox } from '@/lox'
import type { LoxObject } from './values'

export class Interpreter implements ast.ExprVisitor<LoxObject> {
  public interpret(expression: ast.Expr): void {
    try {
      let value = this.evaluate(expression)
      console.log(this.stringify(value))
    } catch (err) {
      if (err instanceof RuntimeError) {
        Lox.runtimeError(err)
      }
    }
  }

  private evaluate(expr: ast.Expr): LoxObject {
    return expr.accept(this)
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
