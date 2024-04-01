import {
  BinaryExpr,
  type Expr,
  type ExprVisitor,
  LiteralExpr,
  UnaryExpr,
  GroupingExpr,
} from './ast'
import { Token, TokenType } from './lexer'

/**
 * Represents the Abstract Syntax Tree as an S-expression
 * @see `https://en.wikipedia.org/wiki/S-expression`
 */
export class AstPrinter implements ExprVisitor<string> {
  print(expr: Expr): string {
    return expr.accept(this)
  }

  private parenthesize(name: string, ...exprs: Expr[]): string {
    let str = `(${name}`
    for (const expr of exprs) {
      str += ` ${expr.accept(this)}`
    }
    return str + ')'
  }

  visitBinaryExpr(expr: BinaryExpr): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right)
  }

  visitGroupingExpr(expr: GroupingExpr): string {
    return this.parenthesize('group', expr.expression)
  }

  visitLiteralExpr(expr: LiteralExpr): string {
    if (expr.value === null) return 'nil'
    return expr.value.toString()
  }

  visitUnaryExpr(expr: UnaryExpr): string {
    return this.parenthesize(expr.operator.lexeme, expr.right)
  }
}

function test() {
  const expression = new BinaryExpr( // -123 * (45.67)
    new UnaryExpr(
      new Token(TokenType.MINUS, '-', null, 1),
      new LiteralExpr(123),
    ),
    new Token(TokenType.STAR, '*', null, 1),
    new GroupingExpr(new LiteralExpr(45.67)),
  )

  const printer = new AstPrinter()
  console.log(printer.print(expression)) // (* (- 123) (group 45.67))
}

// test()
