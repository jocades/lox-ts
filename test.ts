import { $ } from 'bun'
import fs from 'fs/promises'

// files are ordered by like: 01_abc.lox, 02_def.lox, 03_ghi.lox...
// sort them by name to run them in order

const files = await fs.readdir('./examples')
files.sort((a, b) => a.localeCompare(b))

for (let file of files) {
  if (file.endsWith('.lox')) {
    console.log('RUNNING FILE ->', file)
    await $`bun run main.ts ./examples/${file}`
  }
}
