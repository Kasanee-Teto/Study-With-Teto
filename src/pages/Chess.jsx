import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { createEngine } from '../lib/chessEngine'
import { postJSON, callAI } from '../lib/api'

// Starting FEN — avoids reading refs during render for initial state
const STARTING_FEN = new Chess().fen()

export default function ChessPage() {
  const gameRef = useRef(new Chess())
  const engineRef = useRef(null)

  // Generation counter: incremented on reset to ignore stale bestmove callbacks
  const genRef = useRef(0)

  // Engine readiness tracking
  const uciOkRef = useRef(false)
  const readyOkRef = useRef(false)

  // When we send "go ..." we expect a bestmove later
  const expectingBestmoveRef = useRef(false)
  const bestmoveGenRef = useRef(0)

  const [engineReady, setEngineReady] = useState(false)
  const [fen, setFen] = useState(STARTING_FEN)
  const [status, setStatus] = useState('Your move')
  const [isGameOver, setIsGameOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [coachText, setCoachText] = useState('')
  const [errorText, setErrorText] = useState('')

  function recomputeEngineReady() {
    const ready = uciOkRef.current && readyOkRef.current
    setEngineReady(ready)
    return ready
  }

  function sync() {
    const game = gameRef.current
    setFen(game.fen())

    const over = game.isGameOver()
    setIsGameOver(over)

    if (over) setStatus('Game over')
    else setStatus(game.turn() === 'w' ? 'Your move' : "Teto's move")
  }

  useEffect(() => {
    let mounted = true

    async function init() {
      await postJSON('/api/user/upsert')

      const engine = createEngine()
      engineRef.current = engine

      // One handler for the whole lifecycle (do not overwrite later)
      engine.setMessageHandler((line) => {
        if (!mounted) return
        if (!line) return

        const text = String(line).trim()

        if (text === 'uciok') {
          uciOkRef.current = true
          recomputeEngineReady()
          return
        }

        if (text === 'readyok') {
          readyOkRef.current = true
          recomputeEngineReady()
          return
        }

        if (text.startsWith('bestmove')) {
          // Only apply if we were actually expecting a bestmove
          if (!expectingBestmoveRef.current) return

          // Stop expecting now (prevents double-apply if engine repeats)
          expectingBestmoveRef.current = false

          // Ignore stale bestmove from before reset()
          const expectedGen = bestmoveGenRef.current
          if (genRef.current !== expectedGen) return

          const best = text.split(/\s+/)[1]
          if (best && best !== '(none)') {
            try {
              const game = gameRef.current
              const promotion = best.length >= 5 ? best[4] : 'q'
              game.move({
                from: best.slice(0, 2),
                to: best.slice(2, 4),
                promotion
              })
              sync()
            } catch (e) {
              console.error('Engine bestmove invalid:', best, e)
              setErrorText('Engine returned an invalid move.')
            }
          }

          setBusy(false)
          return
        }

        // Optional: you can debug engine output by uncommenting:
        // console.log('SF:', text)
      })

      // Reset readiness flags each time we (re)create the engine
      uciOkRef.current = false
      readyOkRef.current = false
      recomputeEngineReady()

      engine.send('uci')
      engine.send('isready')
    }

    init().catch((err) => {
      console.error(err)
      setErrorText('Failed to initialise engine.')
    })

    return () => {
      mounted = false
      engineRef.current?.terminate?.()
      engineRef.current = null
    }
  }, [])

  function engineMove() {
    const engine = engineRef.current
    const game = gameRef.current
    if (!engine) {
      setErrorText('Engine not available.')
      return
    }

    // If game already over, don't ask engine
    if (game.isGameOver()) return

    // Record which generation this "go" belongs to
    expectingBestmoveRef.current = true
    bestmoveGenRef.current = genRef.current

    setBusy(true)
    setCoachText('')
    setErrorText('')

    engine.send(`position fen ${game.fen()}`)
    // For beginners, depth is ok. You can switch to movetime for smoother difficulty:
    // engine.send('go movetime 300')
    engine.send('go depth 12')
  }

  async function onDrop(sourceSquare, targetSquare, piece) {
    const game = gameRef.current

    // Guards
    if (busy || game.isGameOver() || !engineReady) return false
    if (game.turn() !== 'w') return false

    // Detect pawn promotion (white to rank 8)
    const isPromotion = piece === 'wP' && targetSquare[1] === '8'

    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: isPromotion ? 'q' : undefined
    })

    if (!move) return false

    sync()
    setErrorText('')

    // Ask coach for quick explanation after player move
    try {
      const coach = await callAI({
        mode: 'coach',
        messages: [
          {
            role: 'user',
            content: `Explain this move in simple terms: ${move.san}. Current FEN: ${game.fen()}`
          }
        ]
      })
      setCoachText(coach)
    } catch (e) {
      console.warn(e)
    }

    // Engine replies
    if (!game.isGameOver()) {
      setTimeout(() => {
        try {
          engineMove()
        } catch (e) {
          console.error(e)
          setBusy(false)
          setErrorText('Engine error. Please reset the game.')
        }
      }, 200)
    }

    return true
  }

  async function saveGame() {
    const game = gameRef.current
    const pgn = game.pgn()
    const result = game.isCheckmate()
      ? (game.turn() === 'w' ? '0-1' : '1-0')
      : game.isDraw()
        ? '1/2-1/2'
        : 'unknown'

    try {
      await postJSON('/api/chess/game', { pgn, result })
      alert('Game saved!')
    } catch (e) {
      alert('Failed to save game: ' + (e.message || String(e)))
    }
  }

  function reset() {
    // Increment generation so any in-flight bestmove is ignored
    genRef.current += 1

    // Cancel current engine search (if any)
    try {
      engineRef.current?.send('stop')
    } catch {
      // ignore
    }

    // Also clear expectation, so a late bestmove won't apply
    expectingBestmoveRef.current = false

    gameRef.current = new Chess()
    setBusy(false)
    setIsGameOver(false)
    setCoachText('')
    setErrorText('')
    sync()
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h2>Chess vs Teto</h2>

      <div>
        Status: {status} {busy ? '(thinking...)' : ''}
      </div>

      {!engineReady && <div style={{ color: 'orange' }}>Engine loading…</div>}
      {errorText && <div style={{ color: 'red' }}>{errorText}</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '420px 1fr',
          gap: 16,
          marginTop: 12
        }}
      >
        <div>
          <Chessboard
            position={fen}
            onPieceDrop={onDrop}
            arePiecesDraggable={!busy && engineReady && !isGameOver}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={reset}>Reset</button>
            <button onClick={saveGame} disabled={!isGameOver}>
              Save PGN (when game over)
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', padding: 12 }}>
          <h3>Teto Coach</h3>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {coachText || 'Make a move to get feedback.'}
          </div>
        </div>
      </div>
    </div>
  )
}