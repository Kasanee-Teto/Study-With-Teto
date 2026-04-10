import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { createEngine } from '../lib/chessEngine'
import { postJSON, callAI } from '../lib/api'

const STARTING_FEN = new Chess().fen()

export default function ChessPage() {
  const gameRef = useRef(new Chess())
  const engineRef = useRef(null)

  const genRef = useRef(0)
  const uciOkRef = useRef(false)
  const readyOkRef = useRef(false)
  const expectingBestmoveRef = useRef(false)
  const bestmoveGenRef = useRef(0)

  const [engineReady, setEngineReady] = useState(false)
  const [fen, setFen] = useState(STARTING_FEN)
  const [status, setStatus] = useState('Your move')
  const [isGameOver, setIsGameOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [coachText, setCoachText] = useState('')
  const [errorText, setErrorText] = useState('')
  const [selectedSquare, setSelectedSquare] = useState(null)

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

      engine.setMessageHandler((line) => {
        if (!mounted || !line) return
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
          if (!expectingBestmoveRef.current) return
          expectingBestmoveRef.current = false
          if (genRef.current !== bestmoveGenRef.current) return

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
        }
      })

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
    if (!engine || !engineReady || game.isGameOver()) return

    expectingBestmoveRef.current = true
    bestmoveGenRef.current = genRef.current

    setBusy(true)
    setCoachText('')
    setErrorText('')

    engine.send(`position fen ${game.fen()}`)
    engine.send('go depth 12')
  }

  async function afterPlayerMove(moveSan) {
    const game = gameRef.current
    sync()
    setErrorText('')

    try {
      const coach = await callAI({
        mode: 'coach',
        messages: [
          {
            role: 'user',
            content: `Explain this move in simple terms: ${moveSan}. Current FEN: ${game.fen()}`
          }
        ]
      })
      setCoachText(coach)
    } catch (e) {
      console.warn('Coach unavailable:', e)
    }

    if (!game.isGameOver() && engineReady) {
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
  }

  // Shared move logic (used by drag and click)
  async function tryPlayerMove(from, to, pieceHint) {
    const game = gameRef.current
    if (busy || game.isGameOver()) return false
    if (game.turn() !== 'w') return false

    const isPromotion =
      (pieceHint === 'wP' || game.get(from)?.type === 'p') && to?.[1] === '8'

    let move = null
    try {
      move = game.move({
        from,
        to,
        promotion: isPromotion ? 'q' : undefined
      })
    } catch {
      return false
    }

    if (!move) return false
    await afterPlayerMove(move.san)
    return true
  }

  async function onDrop(sourceSquare, targetSquare, piece) {
    return await tryPlayerMove(sourceSquare, targetSquare, piece)
  }

  // Fallback for touch/mobile emulation: click source then destination
  async function onPieceClick(piece, square) {
    if (busy || isGameOver) return

    if (!selectedSquare) {
      // first click: only white piece on white turn
      const g = gameRef.current
      const p = g.get(square)
      if (!p || p.color !== 'w' || g.turn() !== 'w') return
      setSelectedSquare(square)
      return
    }

    // second click: attempt move
    const from = selectedSquare
    const to = square
    setSelectedSquare(null)
    await tryPlayerMove(from, to, piece)
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
    genRef.current += 1
    try {
      engineRef.current?.send('stop')
    } catch {}
    expectingBestmoveRef.current = false

    gameRef.current = new Chess()
    setBusy(false)
    setIsGameOver(false)
    setCoachText('')
    setErrorText('')
    setSelectedSquare(null)
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
            onPieceClick={onPieceClick}
            arePiecesDraggable={!busy && !isGameOver}
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