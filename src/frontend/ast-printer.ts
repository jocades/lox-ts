import * as ast from './ast'
import { Token, TokenType } from './lexer'

/**
 * Represents the Abstract Syntax Tree as an S-expression
 * @see `https://en.wikipedia.org/wiki/S-expression`
 */
export class AstPrinter implements ast.ExprVisitor<string> {
  print(expr: ast.Expr): string {
    return expr.accept(this)
  }

  private parenthesize(name: string, ...exprs: ast.Expr[]): string {
    let str = `(${name}`
    for (const expr of exprs) {
      str += ` ${expr.accept(this)}`
    }
    return str + ')'
  }

  visitBinaryExpr(expr: ast.BinaryExpr): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right)
  }

  visitGroupingExpr(expr: ast.GroupingExpr): string {
    return this.parenthesize('group', expr.expression)
  }

  visitLiteralExpr(expr: ast.LiteralExpr): string {
    if (expr.value === null) return 'nil'
    return expr.value.toString()
  }

  visitUnaryExpr(expr: ast.UnaryExpr): string {
    return this.parenthesize(expr.operator.lexeme, expr.right)
  }
}

function test() {
  const expression = new ast.BinaryExpr( // -123 * (45.67)
    new ast.UnaryExpr(
      new Token(TokenType.MINUS, '-', null, 1),
      new ast.LiteralExpr(123),
    ),
    new Token(TokenType.STAR, '*', null, 1),
    new ast.GroupingExpr(new ast.LiteralExpr(45.67)),
  )

  const printer = new AstPrinter()
  console.log(printer.print(expression)) // (* (- 123) (group 45.67))
}

// test()
