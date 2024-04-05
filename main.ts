#!/usr/bin/env -S bun run

import { Lox } from '@/lox'

async function main(argv: string[]) {
  if (argv.length > 3) {
    console.log('Usage: lox [script]')
    process.exit(69)
  }

  if (argv.length === 3) {
    await Lox.file(argv[2])
  }

  if (argv.length === 2) {
    await Lox.repl()
  }
}

if (import.meta.main) {
  main(process.argv) // ARGV -> ['/bin/bun', '__filename', ...args]
}
