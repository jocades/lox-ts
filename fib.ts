function fib(n: number): number {
  if (n < 2) return n
  return fib(n - 1) + fib(n - 2)
}

let start = Date.now()
console.log(fib(10))
let elapsed = Date.now() - start

console.log(elapsed + ' ms')
console.log(elapsed / 1000)
