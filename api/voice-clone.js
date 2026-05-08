/**
 * api/voice-clone.js
 *
 * Fish Audio voice-cloning proxy.
 *
 *  GET    /api/voice-clone          → list the current user's private voice models
 *  POST   /api/voice-clone          → create a new voice model (clone)
 *  DELETE /api/voice-clone?id=<id>  → delete a voice model
 *
 * POST body (JSON):
 *   {
 *     title:   string,
 *     samples: [{ audio: "<base64 WAV>", text: "<transcript>" }, ...]
 *   }
 *
 * Fish Audio requires multipart/form-data for model creation, so we decode
 * the base64 payload server-side and rebuild the FormData before forwarding.
 */

import { requireUser } from './_lib/requireUser.js'

const FISH_API = 'https://api.fish.audio'
const MAX_SAMPLES = 3

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } }
}

export default async function handler(req, res) {
  try {
    await requireUser(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const apiKey = process.env.FISH_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Server misconfiguration: missing FISH_API_KEY' })

  // ── GET — list models ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const resp = await fetch(
        `${FISH_API}/model?self=true&page_size=50&type=tts`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      )
      const data = await resp.json()
      if (!resp.ok) return res.status(resp.status).json({ error: data?.message || 'Failed to list models' })
      return res.status(200).json({ models: data?.items || [] })
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to list models' })
    }
  }

  // ── POST — create / clone ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { title, samples } = req.body || {}

      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Missing voice name' })
      }
      if (!Array.isArray(samples) || samples.length === 0) {
        return res.status(400).json({ error: 'At least one audio sample is required' })
      }
      if (samples.length > MAX_SAMPLES) {
        return res.status(400).json({ error: `Maximum ${MAX_SAMPLES} samples allowed` })
      }

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i]
        if (!s?.audio) return res.status(400).json({ error: `Sample ${i + 1}: missing audio` })
        if (!s?.text?.trim()) return res.status(400).json({ error: `Sample ${i + 1}: missing transcript text` })
      }

      const formData = new FormData()
      formData.append('type', 'tts')
      formData.append('train_mode', 'fast')
      formData.append('title', title.trim())
      formData.append('visibility', 'private')

      for (const sample of samples) {
        let buffer
        try {
          buffer = Buffer.from(sample.audio, 'base64')
        } catch {
          return res.status(400).json({ error: 'Invalid base64 in audio sample' })
        }
        if (buffer.length === 0) return res.status(400).json({ error: 'Audio sample is empty' })

        const blob = new Blob([buffer], { type: 'audio/wav' })
        formData.append('voices', blob, 'sample.wav')
        formData.append('texts', sample.text.trim())
      }

      const resp = await fetch(`${FISH_API}/model`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
      })

      const data = await resp.json()
      if (!resp.ok) {
        const msg = Array.isArray(data) ? data[0]?.msg : data?.message
        return res.status(resp.status).json({ error: msg || 'Failed to create voice model' })
      }

      return res.status(201).json({ model: data })
    } catch (err) {
      console.error('[voice-clone] create error:', err)
      return res.status(500).json({ error: err.message || 'Server error' })
    }
  }

  // ── DELETE — remove model ────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const modelId = req.query?.id
      if (!modelId) return res.status(400).json({ error: 'Missing model id' })

      const resp = await fetch(`${FISH_API}/model/${modelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` }
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        return res.status(resp.status).json({ error: data?.message || 'Failed to delete model' })
      }
      return res.status(200).json({ deleted: true })
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}