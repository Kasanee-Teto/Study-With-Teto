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
  const [engineReady, setEngineReady] = useState(false)

  const [fen, setFen] = useState(STARTING_FEN)
  const [status, setStatus] = useState('Your move')
  const [isGameOver, setIsGameOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [coachText, setCoachText] = useState('')
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    async function init() {
      await postJSON('/api/user/upsert')
      const engine = createEngine()
      engineRef.current = engine

      // Register handler BEFORE sending any commands
      engine.setMessageHandler((line) => {
        if (!line) return
        if (line.startsWith('readyok')) {
          setEngineReady(true)
        }
      })

      engine.send('uci')
      engine.send('isready')
    }
    init().catch(err => {
      console.error(err)
      setErrorText('Failed to initialise engine.')
    })

    return () => {
      engineRef.current?.terminate?.()
    }
  }, [])

  function sync() {
    const game = gameRef.current
    setFen(game.fen())
    const over = game.isGameOver()
    setIsGameOver(over)
    if (over) setStatus('Game over')
    else setStatus(game.turn() === 'w' ? 'Your move' : "Teto's move")
  }

  function engineMove() {
    const engine = engineRef.current
    const game = gameRef.current
    const gen = genRef.current

    setBusy(true)
    setCoachText('')
    setErrorText('')

    // Register handler before issuing go command
    engine.setMessageHandler((line) => {
      if (!line) return
      if (line.startsWith('readyok')) {
        setEngineReady(true)
        return
      }
      if (line.startsWith('bestmove')) {
        // Ignore stale callbacks from a previous generation (e.g. after reset)
        if (genRef.current !== gen) return

        const best = line.split(' ')[1]
        if (best && best !== '(none)') {
          try {
            const promotion = best.length >= 5 ? best[4] : 'q'
            game.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion })
            sync()
          } catch (e) {
            console.error('Engine bestmove invalid:', best, e)
            setErrorText('Engine returned an invalid move.')
          }
        }
        setBusy(false)
      }
    })

    engine.send(`position fen ${game.fen()}`)
    engine.send('go depth 12')
  }

  async function onDrop(sourceSquare, targetSquare, piece) {
    const game = gameRef.current
    if (busy || game.isGameOver() || !engineReady) return false
    if (game.turn() !== 'w') return false

    // Detect pawn promotion
    const isPromotion =
      piece === 'wP' &&
      targetSquare[1] === '8'

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
        messages: [{ role: 'user', content: `Explain this move in simple terms: ${move.san}. Current FEN: ${game.fen()}` }]
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
    // Stop the engine
    engineRef.current?.send('stop')

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
      <div>Status: {status} {busy ? '(thinking...)' : ''}</div>
      {!engineReady && <div style={{ color: 'orange' }}>Engine loading…</div>}
      {errorText && <div style={{ color: 'red' }}>{errorText}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 16, marginTop: 12 }}>
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
