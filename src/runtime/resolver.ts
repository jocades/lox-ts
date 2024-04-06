import * as ast from '@/frontend/ast'
import type { Interpreter } from './interpreter'
import type { Token } from '@/frontend/lexer'
import { Lox } from '@/lox'

const enum FunctionType {
  NONE,
  FUNCTION,
  INITIALIZER,
  METHOD,
}

const enum ClassType {
  NONE,
  CLASS,
  SUBCLASS,
}

const enum VariableState {
  DECLARED,
  DEFINED,
  READ, // -> resolved
}

class Variable {
  constructor(
    public name: Token,
    public state: VariableState,
  ) {}
}

class Stack<T> extends Array<T> {
  peek(): T {
    return this[this.length - 1]
  }

  isEmpty(): boolean {
    return this.length === 0
  }
}

export class Resolver implements ast.ExprVisitor<void>, ast.StmtVisitor<void> {
  private interpreter: Interpreter
  private scopes: Stack<Map<string, Variable>> = new Stack()

  private currentFunction = FunctionType.NONE
  private currentClass = ClassType.NONE

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter
  }

  visitBlockStmt(stmt: ast.BlockStmt): void {
    this.beginScope()
    this.resolve(stmt.statements)
    this.endScope()
  }

  visitClassStmt(stmt: ast.ClassStmt): void {
    let enclosingClass = this.currentClass
    this.currentClass = ClassType.CLASS

    this.declare(stmt.name)
    this.define(stmt.name)

    if (
      stmt.superclass !== null &&
      stmt.name.lexeme === stmt.superclass.name.lexeme
    ) {
      Lox.error(stmt.superclass.name, 'A class cannot inherit from itself.')
    }

    if (stmt.superclass !== null) {
      this.currentClass = ClassType.SUBCLASS
      this.resolve(stmt.superclass)
    }

    if (stmt.superclass !== null) {
      this.beginScope()
      this.scopes
        .peek()
        .set('super', new Variable(stmt.name, VariableState.READ))
    }

    this.beginScope()
    this.scopes.peek().set('this', new Variable(stmt.name, VariableState.READ))

    for (let method of stmt.methods) {
      let declaration = FunctionType.METHOD
      if (method.name.lexeme === 'init') {
        declaration = FunctionType.INITIALIZER
      }
      this.resolveFunction(method.fn, declaration)
    }

    this.endScope()

    if (stmt.superclass !== null) this.endScope()

    this.currentClass = enclosingClass
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
    this.resolveLocal(expr, expr.name, false)
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

  visitGetExpr(expr: ast.GetExpr): void {
    this.resolve(expr.object)
  }

  visitGroupingExpr(expr: ast.GroupingExpr): void {
    this.resolve(expr.expression)
  }

  visitLiteralExpr(_expr: ast.LiteralExpr): void {}

  visitLogicalExpr(expr: ast.LogicalExpr): void {
    this.resolve(expr.left)
    this.resolve(expr.right)
  }

  visitSetExpr(expr: ast.SetExpr): void {
    this.resolve(expr.value)
    this.resolve(expr.object)
  }

  visitSuperExpr(expr: ast.SuperExpr): void {
    if (this.currentClass === ClassType.NONE) {
      Lox.error(expr.keyword, "Cannot use 'super' outside of a class.")
    } else if (this.currentClass !== ClassType.SUBCLASS) {
      Lox.error(
        expr.keyword,
        "Cannot use 'super' in a class with no superclas.",
      )
    }

    this.resolveLocal(expr, expr.keyword, true)
  }

  visitThisExpr(expr: ast.ThisExpr): void {
    if (this.currentClass === ClassType.NONE) {
      Lox.error(expr.keyword, "Cannot use 'this' outside of a class.")
    }

    this.resolveLocal(expr, expr.keyword, true)
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

    if (stmt.value !== null) {
      if (this.currentFunction === FunctionType.INITIALIZER) {
        Lox.error(stmt.keyword, 'Cannot return a value from an initializer.')
      }

      this.resolve(stmt.value)
    }
  }

  visitVariableExpr(expr: ast.VariableExpr): void {
    if (
      !this.scopes.isEmpty() &&
      this.scopes.peek().get(expr.name.lexeme)?.state === VariableState.DECLARED
    ) {
      Lox.error(expr.name, 'Cannot read local variable in its own initializer.')
    }

    this.resolveLocal(expr, expr.name, true)
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
    let scope = this.scopes.pop()!

    for (let variable of scope.values()) {
      if (variable.state === VariableState.DEFINED) {
        Lox.warn(
          variable.name,
          'Local variable is defined but never used. Consider removing it.',
        )
      }
    }
  }

  private declare(name: Token): void {
    if (this.scopes.isEmpty()) return

    let scope = this.scopes.peek()
    if (scope.has(name.lexeme)) {
      Lox.error(name, 'Variable with this name already declared in this scope.')
    }

    scope.set(name.lexeme, new Variable(name, VariableState.DECLARED))
  }

  private define(name: Token): void {
    if (this.scopes.isEmpty()) return
    this.scopes
      .peek()
      .set(name.lexeme, new Variable(name, VariableState.DEFINED))
  }

  private resolveLocal(expr: ast.Expr, name: Token, isRead: boolean): void {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i)

        // If read op, mark as used.
        if (isRead) {
          this.scopes[i].get(name.lexeme)!.state = VariableState.READ
        }
        return
      }
    }
    // Not found. Assume it is global.
  }
}

// https://craftinginterpreters.com/resolving-and-binding.html#a-variable-resolution-pass
