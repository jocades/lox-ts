export const Debug = {
  AST: Bun.env.AST === '1',
  EVAL: Bun.env.EVAL === '1',
  LEX: Bun.env.LEX === '1',
  STACK: Bun.env.STACK === '1',
}
