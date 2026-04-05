import Stockfish from 'stockfish'

export function createEngine() {
  const engine = Stockfish()
  let onMessage = null

  engine.onmessage = (e) => {
    const line = typeof e === 'string' ? e : e?.data
    if (onMessage) onMessage(line)
  }

  function send(cmd) {
    engine.postMessage(cmd)
  }

  function setMessageHandler(fn) {
    onMessage = fn
  }

  return { send, setMessageHandler, terminate: () => engine.terminate?.() }
}