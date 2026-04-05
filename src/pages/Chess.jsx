import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { createEngine } from '../lib/chessEngine'
import { postJSON, callAI } from '../lib/api'

export default function ChessPage() {
  const gameRef = useRef(new Chess())
  const engineRef = useRef(null)

  const [fen, setFen] = useState(gameRef.current.fen())
  const [status, setStatus] = useState('Your move')
  const [busy, setBusy] = useState(false)
  const [coachText, setCoachText] = useState('')

  const isGameOver = useMemo(() => gameRef.current.isGameOver(), [fen])

  useEffect(() => {
    async function init() {
      await postJSON('/api/user/upsert')
      engineRef.current = createEngine()
      engineRef.current.send('uci')
      engineRef.current.send('isready')
    }
    init()

    return () => {
      engineRef.current?.terminate?.()
    }
  }, [])

  function sync() {
    setFen(gameRef.current.fen())
    if (gameRef.current.isGameOver()) setStatus('Game over')
    else setStatus(gameRef.current.turn() === 'w' ? 'Your move' : "Teto's move")
  }

  async function engineMove() {
    setBusy(true)
    setCoachText('')
    const engine = engineRef.current
    const game = gameRef.current

    // Give engine the position
    engine.send(`position fen ${game.fen()}`)
    engine.send('go depth 12')

    engine.setMessageHandler((line) => {
      if (!line) return
      if (line.startsWith('bestmove')) {
        const best = line.split(' ')[1]
        if (best && best !== '(none)') {
          game.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: 'q' })
          sync()
        }
        setBusy(false)
      }
    })
  }

  async function onDrop(sourceSquare, targetSquare) {
    const game = gameRef.current
    if (busy || game.isGameOver()) return false
    if (game.turn() !== 'w') return false

    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    })
    if (!move) return false

    sync()

    // optional: ask coach for quick explanation (after your move)
    try {
      const coach = await callAI({
        mode: 'coach',
        messages: [{ role: 'user', content: `Explain this move in simple terms: ${move.san}. Current FEN: ${game.fen()}` }]
      })
      setCoachText(coach)
    } catch (e) {
      console.warn(e)
    }

    // engine replies
    setTimeout(engineMove, 200)
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

    await postJSON('/api/chess/game', { pgn, result })
    alert('Game saved!')
  }

  function reset() {
    gameRef.current = new Chess()
    setCoachText('')
    sync()
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h2>Chess vs Teto</h2>
      <div>Status: {status} {busy ? '(thinking...)' : ''}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 16, marginTop: 12 }}>
        <div>
          <Chessboard position={fen} onPieceDrop={onDrop} />
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
