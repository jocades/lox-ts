import * as ast from '@/frontend/ast'
import { Token, TokenType } from '@/frontend/lexer'
import { BreakError, RuntimeError } from '@/lib/errors'
import { Lox } from '@/lox'
import { LoxCallable, LoxClockFn, LoxFunction, type LoxObject } from './values'
import { Environment } from './environment'

interface InterpreterOptions {
  repl?: boolean
}

export class Interpreter
  implements ast.ExprVisitor<LoxObject>, ast.StmtVisitor<void>
{
  globals = new Environment()
  private environment = this.globals
  private options: InterpreterOptions = { repl: false }

  constructor() {
    this.globals.define('clock', new LoxClockFn())
  }

  public interpret(statements: ast.Stmt[], options?: InterpreterOptions): void {
    this.setup(options)

    for (let statement of statements) {
      try {
        this.execute(statement)
      } catch (err) {
        if (err instanceof RuntimeError || err instanceof BreakError) {
          Lox.runtimeError(err)
        } else throw err
      }
    }
  }

  private evaluate(expr: ast.Expr): LoxObject {
    return expr.accept(this)
  }

  private execute(stmt: ast.Stmt): void {
    stmt.accept(this)
  }

  // -- STMT VISITORS ---

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

  visitBreakStmt(stmt: ast.BreakStmt): void {
    throw new BreakError(stmt.keyword, 'Break statement used outside of loop.')
  }

  visitExpressionStmt(stmt: ast.ExpressionStmt): void {
    let value = this.evaluate(stmt.expression)
    if (this.options.repl) console.log(this.stringify(value))
  }

  visitFunctionStmt(stmt: ast.FunctionStmt): void {
    let fn = new LoxFunction(stmt)
    this.environment.define(stmt.name.lexeme, fn)
  }

  visitIfStmt(stmt: ast.IfStmt): void {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch)
    } else if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch)
    }
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

  visitWhileStmt(stmt: ast.WhileStmt): void {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      try {
        this.execute(stmt.body)
      } catch (err) {
        if (err instanceof BreakError) break
        throw err
      }
    }
  }

  // -- EXPR VISITORS ---

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
        return (left as number) - (right as number)
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
        return (left as number) / (right as number)
      }
      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right)
        return (left as number) * (right as number)
    }

    // unreachable
    return null
  }

  visitCallExpr(expr: ast.CallExpr): LoxObject {
    let callee = this.evaluate(expr.callee)
    let args = expr.args.map((arg) => this.evaluate(arg))

    if (!(callee instanceof LoxCallable)) {
      throw new RuntimeError(expr.paren, 'Can only call functions and classes.')
    }

    if (args.length !== callee.arity()) {
      throw new RuntimeError(
        expr.paren,
        `Expected ${callee.arity()} arguments but got ${args.length}.`,
      )
    }

    return callee.call(this, args)
  }

  visitGroupingExpr(expr: ast.GroupingExpr): LoxObject {
    return this.evaluate(expr.expression)
  }

  visitLiteralExpr(expr: ast.LiteralExpr): LoxObject {
    return expr.value
  }

  visitLogicalExpr(expr: ast.LogicalExpr) {
    let left = this.evaluate(expr.left)

    // check if we can short-circuit
    if (expr.operator.type === TokenType.OR) {
      if (this.isTruthy(left)) return left
    } else {
      if (!this.isTruthy(left)) return left
    }

    return this.evaluate(expr.right)
  }

  visitUnaryExpr(expr: ast.UnaryExpr): LoxObject {
    let right = this.evaluate(expr.right)

    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.isTruthy(right)

      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right)
        return -(right as number)
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

  private setup(options?: InterpreterOptions): void {
    if (!options) return
    this.options = { ...this.options, ...options }
  }

  public stringify(object: LoxObject) {
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
