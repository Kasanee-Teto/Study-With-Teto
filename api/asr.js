/**
 * api/asr.js — Fish Audio ASR (Speech-to-Text) proxy
 *
 * Accepts:  POST application/json  { audio: "<base64>", mimeType: "audio/wav" }
 * Returns:  JSON { text, duration, segments }
 *
 * Note: the client (asrService.js) converts webm/opus recordings to WAV before
 * uploading. This server-side fix strips codec parameters as an extra safety net.
 */

const FISH_ASR_URL = 'https://api.fish.audio/v1/asr'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const apiKey = process.env.FISH_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Server misconfiguration: missing FISH_API_KEY' })
    }

    const { audio, mimeType = 'audio/webm' } = req.body || {}

    if (!audio) {
      return res.status(400).json({ error: 'Missing "audio" field (base64 encoded audio)' })
    }

    // Decode base64 → binary buffer
    let audioBuffer
    try {
      audioBuffer = Buffer.from(audio, 'base64')
    } catch {
      return res.status(400).json({ error: 'Invalid base64 encoding in "audio" field' })
    }

    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Audio buffer is empty' })
    }

    // Cap at 25 MB (Fish limit guidance)
    const MAX_BYTES = 25 * 1024 * 1024
    if (audioBuffer.length > MAX_BYTES) {
      return res.status(413).json({ error: 'Audio file too large (max 25 MB)' })
    }

    // Build multipart/form-data for Fish ASR
    const formData = new FormData()

    // Strip codec parameters (e.g. 'audio/webm;codecs=opus' → 'audio/webm')
    // so the extension mapping and Fish format detection work correctly.
    const baseMime = mimeType.split(';')[0].trim().toLowerCase()
    const ext      = mimeToExtension(baseMime)
    const blob     = new Blob([audioBuffer], { type: baseMime })
    formData.append('audio', blob, `recording.${ext}`)
    formData.append('language', 'id')             // Indonesian input
    formData.append('ignore_timestamps', 'true')  // faster, no segment timing needed

    const fishResp = await fetch(FISH_ASR_URL, {
      method:  'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body:    formData,
    })

    if (!fishResp.ok) {
      const details = await fishResp.text()
      console.error(`[asr] Fish error ${fishResp.status}:`, details)
      return res.status(fishResp.status).json({
        error:   `Fish ASR error (${fishResp.status})`,
        details: details.slice(0, 500),
      })
    }

    const result = await fishResp.json()

    return res.status(200).json({
      text:     result.text     || '',
      duration: result.duration || 0,
      segments: result.segments || [],
    })

  } catch (err) {
    console.error('[asr] Unhandled error:', err)
    return res.status(500).json({ error: err.message || 'ASR failed' })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map base MIME types (no codec params) to file extensions Fish understands.
 * Always call with baseMimeType (strip ';codecs=…' first).
 */
function mimeToExtension(baseMime) {
  const map = {
    'audio/wav':  'wav',
    'audio/wave': 'wav',
    'audio/ogg':  'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp3':  'mp3',
    'audio/mp4':  'm4a',
    'audio/m4a':  'm4a',
    'audio/flac': 'flac',
    'audio/aac':  'aac',
    'audio/webm': 'webm', // passthrough — client should have converted to WAV already
  }
  return map[baseMime] ?? 'wav' // default to wav (safest fallback)
}