import { $ } from "bun";
import fs from "fs/promises";

const files = await fs.readdir("./examples");
files.sort((a, b) => a.localeCompare(b));

for (let file of files) {
  if (file.endsWith(".lox")) {
    console.log("RUNNING FILE ->", file);
    await $`bun run main.ts ./examples/${file}`;
  }
}
