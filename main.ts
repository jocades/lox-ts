#!/usr/bin/env -S bun run

import { Lox } from './src/lox'

async function main(argv: string[]) {
  if (argv.length > 3) {
    console.log('Usage: lox [script]')
    process.exit(69)
  }

  if (argv.length === 3) {
    await Lox.file(argv[2])
  }

  if (argv.length === 2) {
    Lox.repl()
  }
}

if (import.meta.main) {
  // ARGV -> ['/bin/bun', '__filename', ...args]
  main(process.argv)
}
