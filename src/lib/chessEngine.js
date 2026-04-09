export function createEngine() {
  const wasmSupported =
    typeof WebAssembly === 'object' &&
    typeof WebAssembly.validate === 'function' &&
    WebAssembly.validate(Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0))

  const worker = new Worker(wasmSupported ? '/stockfish.wasm.js' : '/stockfish.js')

  let onMessage = null
  worker.onmessage = (e) => onMessage?.(String(e.data))

  return {
    send(cmd) {
      worker.postMessage(cmd)
    },
    setMessageHandler(fn) {
      onMessage = fn
    },
    terminate() {
      worker.terminate()
    }
  }
}