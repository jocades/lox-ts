export const Debug = {
  AST: Bun.env.AST === '1',
  LEX: Bun.env.LEX === '1',
  JSON: Bun.env.JSON === '1',
  EXPR: Bun.env.EXPR === '1',
}
