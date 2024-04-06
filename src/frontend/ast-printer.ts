import * as ast from './ast'
import { Token, TokenType } from './lexer'

/**
 * Represents the Abstract Syntax Tree as an S-expression
 * @see `https://en.wikipedia.org/wiki/S-expression`
 */
export class AstPrinter
  implements ast.ExprVisitor<string>, ast.StmtVisitor<string>
{
  stringify(node: ast.Expr | ast.Stmt | ast.Stmt[]): string {
    if (Array.isArray(node)) {
      return node.map((stmt) => stmt.accept(this)).join('\n')
    }
    return node.accept(this)
  }

  private parenthesize(name: string, ...exprs: ast.Expr[]): string {
    let result = ''

    result += `(${name}`
    for (const expr of exprs) {
      result += ` ${expr.accept(this)}`
    }

    return result + ')'
  }

  private indent(lines: string): string {
    return lines
      .split('\n')
      .map((line) => '  ' + line)
      .join('\n')
  }

  visitBinaryExpr(expr: ast.BinaryExpr): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right)
  }

  visitFunctionExpr(expr: ast.FunctionExpr): string {
    const paramsResult =
      expr.params.length > 0
        ? ` (params ${expr.params.map((p) => p.lexeme).join(' ')})`
        : ''
    let result = `(fun ${paramsResult}\n`
    result += this.indent(this.stringify(new ast.BlockStmt(expr.body))) + ')'

    return result
  }

  visitBreakStmt(_stmt: ast.BreakStmt): string {
    return '(break)'
  }

  visitConditionalExpr(expr: ast.ConditionalExpr): string {
    return this.parenthesize(
      '?',
      expr.condition,
      expr.thenBranch,
      expr.elseBranch,
    )
  }

  visitGroupingExpr(expr: ast.GroupingExpr): string {
    return this.parenthesize('group', expr.expression)
  }

  visitLiteralExpr(expr: ast.LiteralExpr): string {
    if (expr.value === null) return 'nil'
    if (typeof expr.value === 'string') return `"${expr.value}"`
    return expr.value.toString()
  }

  visitUnaryExpr(expr: ast.UnaryExpr): string {
    return this.parenthesize(expr.operator.lexeme, expr.right)
  }

  visitVariableExpr(expr: ast.VariableExpr): string {
    return expr.name.lexeme
  }

  visitAssignExpr(expr: ast.AssignExpr): string {
    const name = new ast.VariableExpr(expr.name)
    return this.parenthesize('assign', name, expr.value)
  }

  visitLogicalExpr(expr: ast.LogicalExpr): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right)
  }

  visitCallExpr(expr: ast.CallExpr): string {
    return this.parenthesize('call', expr.callee, ...expr.args)
  }

  visitGetExpr(expr: ast.GetExpr): string {
    return this.parenthesize(`get ${expr.name.lexeme}`, expr.object)
  }

  visitSetExpr(expr: ast.SetExpr): string {
    return this.parenthesize(`set ${expr.name.lexeme}`, expr.object, expr.value)
  }

  visitThisExpr(expr: ast.ThisExpr): string {
    return this.parenthesize(expr.keyword.lexeme)
  }

  visitSuperExpr(expr: ast.SuperExpr): string {
    return this.parenthesize(`get ${expr.method.lexeme} (super)`)
  }

  visitEchoStmt(stmt: ast.EchoStmt): string {
    return this.parenthesize('echo', stmt.expression)
  }

  visitExpressionStmt(stmt: ast.ExpressionStmt): string {
    return this.parenthesize('expression', stmt.expression)
  }

  visitLetStmt(stmt: ast.LetStmt): string {
    const name = new ast.VariableExpr(stmt.name)
    if (stmt.initializer) {
      return this.parenthesize('let', name, stmt.initializer)
    } else {
      return this.parenthesize('let', name)
    }
  }

  visitBlockStmt(stmt: ast.BlockStmt): string {
    let result = '(block'
    stmt.statements.forEach((innerStmt) => {
      result += '\n' + this.indent(this.stringify(innerStmt))
    })
    result += ')'

    return result
  }

  visitIfStmt(stmt: ast.IfStmt): string {
    let result = `(if ${this.stringify(stmt.condition)}\n`

    const thenBranchResult = this.stringify(stmt.thenBranch)
    result += this.indent(thenBranchResult)

    if (stmt.elseBranch !== null) {
      result += '\n'
      const elseBranchResult = this.stringify(stmt.elseBranch)
      result += this.indent(elseBranchResult)
    }
    result += ')'

    return result
  }

  visitWhileStmt(stmt: ast.WhileStmt): string {
    let result = `(while ${this.stringify(stmt.condition)}\n`
    const bodyResult = this.stringify(stmt.body)
    result += this.indent(bodyResult) + ')'

    return result
  }

  visitFunctionStmt(stmt: ast.FunctionStmt): string {
    const paramsResult =
      stmt.fn.params.length > 0
        ? ` (params ${stmt.fn.params.map((p) => p.lexeme).join(' ')})`
        : ''
    let result = `(fun ${stmt.name.lexeme}${paramsResult}\n`
    result += this.indent(this.stringify(new ast.BlockStmt(stmt.fn.body))) + ')'

    return result
  }

  visitReturnStmt(stmt: ast.ReturnStmt): string {
    return stmt.value !== null
      ? this.parenthesize(stmt.keyword.lexeme, stmt.value)
      : this.parenthesize(stmt.keyword.lexeme)
  }

  visitClassStmt(stmt: ast.ClassStmt): string {
    let result = `(class ${stmt.name.lexeme}`
    if (stmt.superclass !== null) result += ' ' + stmt.superclass.name.lexeme

    stmt.methods.forEach((method) => {
      result += '\n' + this.indent(this.stringify(method))
    })
    result += ')'

    return result
  }
}

function testBinOp() {
  const expression = new ast.BinaryExpr( // -123 * (45.67)
    new ast.UnaryExpr(
      new Token(TokenType.MINUS, '-', null, 1, 0),
      new ast.LiteralExpr(123),
    ),
    new Token(TokenType.STAR, '*', null, 1, 0),
    new ast.GroupingExpr(new ast.LiteralExpr(45.67)),
  )

  const printer = new AstPrinter()
  console.log(printer.stringify(expression))
  // console.log(printer.print(expression)) // (* (- 123) (group 45.67))
}

// testBinOp()

function testProgram() {
  let program = [
    new ast.LetStmt(
      new Token(TokenType.IDENTIFIER, 'x', null, 1, 0),
      new ast.LiteralExpr(123),
    ),
    new ast.LetStmt(
      new Token(TokenType.IDENTIFIER, 'y', null, 1, 0),
      new ast.LiteralExpr(456),
    ),
    new ast.EchoStmt(
      new ast.BinaryExpr(
        new ast.VariableExpr(new Token(TokenType.IDENTIFIER, 'x', null, 1, 0)),
        new Token(TokenType.PLUS, '+', null, 1, 0),
        new ast.VariableExpr(new Token(TokenType.IDENTIFIER, 'y', null, 1, 0)),
      ),
    ),
  ]

  const printer = new AstPrinter()
  console.log(printer.stringify(program))
}

// testProgram()
