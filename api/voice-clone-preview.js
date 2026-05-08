/**
 * api/voice-clone-preview.js
 *
 * TTS preview endpoint that accepts a dynamic Fish Audio reference_id.
 * Used by the Voice Cloning Studio page to audition cloned voices.
 *
 * POST body: { referenceId: string, text: string }
 * Returns:   raw MP3 bytes (audio/mpeg)
 */

import { requireUser } from './_lib/requireUser.js'

const FISH_TTS_URL = 'https://api.fish.audio/v1/tts'
const MAX_PREVIEW_LENGTH = 500

export const config = {
  api: { responseLimit: '8mb' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    await requireUser(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const apiKey = process.env.FISH_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server misconfiguration: missing FISH_API_KEY' })

    const { referenceId, text } = req.body || {}
    if (!referenceId) return res.status(400).json({ error: 'Missing referenceId' })
    if (!text?.trim()) return res.status(400).json({ error: 'Missing text' })

    const input = String(text).trim().slice(0, MAX_PREVIEW_LENGTH)

    const fishResp = await fetch(FISH_TTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        model: 's2-pro',
      },
      body: JSON.stringify({
        text: input,
        reference_id: referenceId,
        format: 'mp3',
        mp3_bitrate: 128,
        latency: 'normal',
      }),
    })

    if (!fishResp.ok) {
      const details = await fishResp.text()
      console.error(`[voice-clone-preview] Fish error ${fishResp.status}:`, details)
      return res.status(fishResp.status).json({
        error: `Fish Audio error (${fishResp.status})`,
        details: details.slice(0, 300),
      })
    }

    const audioBuffer = Buffer.from(await fishResp.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(audioBuffer)
  } catch (err) {
    console.error('[voice-clone-preview] error:', err)
    return res.status(500).json({ error: err.message || 'Preview failed' })
  }
}