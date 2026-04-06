#!/usr/bin/env node
// Copies the Stockfish browser-compatible files from node_modules to public/
// so they can be loaded as a Web Worker without Vite trying to bundle them.
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const SRC_JS = resolve(root, 'node_modules/stockfish/bin/stockfish-18-lite-single.js')
const SRC_WASM = resolve(root, 'node_modules/stockfish/bin/stockfish-18-lite-single.wasm')
const DEST_DIR = resolve(root, 'public')

if (!existsSync(SRC_JS) || !existsSync(SRC_WASM)) {
  console.error(
    '[postinstall] ERROR: Stockfish binary files not found in node_modules/stockfish/bin/.\n' +
    'Make sure the "stockfish" package is installed.'
  )
  process.exit(1)
}

mkdirSync(DEST_DIR, { recursive: true })

copyFileSync(SRC_JS, resolve(DEST_DIR, 'stockfish-18-lite-single.js'))
copyFileSync(SRC_WASM, resolve(DEST_DIR, 'stockfish-18-lite-single.wasm'))

console.log('[postinstall] Stockfish engine files copied to public/')
