export function createEngine() {

  const worker = new Worker('https://cdn.jsdelivr.net/npm/stockfish@16.1.0/src/stockfish.js')

  let onMessage = null

  worker.onmessage = (e) => {
    const line = typeof e.data === 'string' ? e.data : String(e.data)
    onMessage?.(line)
  }

  function send(cmd) {
    worker.postMessage(cmd)
  }

  function setMessageHandler(fn) {
    onMessage = fn
  }

  function terminate() {
    worker.terminate()
  }

  return { send, setMessageHandler, terminate }
}