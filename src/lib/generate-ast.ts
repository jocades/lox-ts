let ouputDir = __dirname + '/ast'

let EXPR = [
  'Assign - name: Token, value: Expr',
  'Binary - left: Expr, operator: Token, right: Expr',
  'Call - callee: Expr, paren: Token, args: Expr[]',
  'Conditional - condition: Expr, thenBranch: Expr, elseBranch: Expr',
  'Function - params: Token[], body: Stmt[]',
  'Grouping - expression: Expr',
  'Literal - value: any',
  'Logical - left: Expr, operator: Token, right: Expr',
  'Unary - operator: Token, right: Expr',
  'Variable - name: Token',
]

let STMT = [
  'Block - statements: Stmt[]',
  'Expression - expression: Expr',
  'Function - name: Token, fn: FunctionExpr',
  'If - condition: Expr, thenBranch: Stmt, elseBranch: Stmt | null',
  'Let - name: Token, initializer: Expr | null',
  'Return - keyword: Token, value: Expr | null',
]

function defineVisitor(type: 'Stmt' | 'Expr', types: string[]) {
  let str = `export interface ${type}Visitor<R> {\n`

  for (let t of types) {
    let name = t.split('-')[0].trim()
    str += `  visit${name}${type}(${type.toLowerCase()}: ${name}${type}): R\n`
  }

  str += '}\n\n'

  return str
}

function defineNode(type: 'Stmt' | 'Expr', str: string) {
  let { name, fields } = parseClass(str)

  str = `export class ${name}${type} implements ${type} {\n`
  str += `  constructor(${fields}) {}\n`
  str += '\n'
  str += `  accept<R>(visitor: ${type}Visitor<R>): R {\n`
  str += `    return visitor.visit${name}${type}(this)\n`
  str += '  }\n'
  str += '}\n\n'

  return str
}

function parseClass(str: string) {
  let [name, fields] = str.split('-').map((x) => x.trim())

  return {
    name,
    fields: fields
      .split(',')
      .map((x) => 'public ' + x.trim())
      .join(', '),
  }
}

async function defineAst(
  outputDir: string,
  type: 'Stmt' | 'Expr',
  types: string[],
) {
  let code = ''

  code += defineVisitor(type, types)

  for (let t of types) {
    code += defineNode(type, t)
  }

  let path = `${outputDir}/${type.toLowerCase()}.ts`

  await Bun.write(path, code)

  console.log(`Generated ${path}`)
}

async function main() {
  await defineAst(ouputDir, 'Expr', EXPR)
  await defineAst(ouputDir, 'Stmt', STMT)
}

if (import.meta.main) {
  main()
}
