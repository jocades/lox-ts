#!/usr/bin/env bash

for filename in ./examples/*.lox; do
    echo "=== Test $(basename $filename) ==="
    bun run main.ts $filename
    echo
done
