export function createEngine() {
  // Load Stockfish from the public directory as a Web Worker.
  // The .js and .wasm files are copied there by the postinstall script.
  let worker
  try {
    worker = new Worker('/stockfish-18-lite-single.js')
  } catch (err) {
    throw new Error(
      'Failed to start Stockfish worker. ' +
      'Make sure you ran `npm install` so the engine files are in public/. ' +
      '(' + (err?.message || err) + ')'
    )
  }

  let onMessage = null

  worker.onmessage = (e) => {
    const line = typeof e === 'string' ? e : e?.data
    if (onMessage) onMessage(line)
  }

  function send(cmd) {
    worker.postMessage(cmd)
  }

  function setMessageHandler(fn) {
    onMessage = fn
  }

  return { send, setMessageHandler, terminate: () => worker.terminate() }
}