/**
 * api/tts.js — Fish Audio TTS proxy
 *
 * Fish raw-API rules applied:
 *  - Header:  model: s2-pro          (required by Fish)
 *  - Body:    reference_id           (NOT model_id)
 *  - Returns: raw MP3 bytes streamed through
 *
 * Emotion/break tags supported by S2-Pro (pass through in text):
 *   [cheerful], [calm], [serious]   — expression hints
 *   (break)                         — pause insertion
 */

const FISH_API_URL    = 'https://api.fish.audio/v1/tts'
const FISH_MODEL_HEADER = 's2-pro'
const FISH_REFERENCE_ID = 'a3b3f0a9c49340bd8fa722d83c81cb08'
const MAX_TEXT_LENGTH  = 3_000  // chars

export const config = {
  api: {
    // We return raw binary — leave default body-parser on (we only read JSON in)
    responseLimit: '10mb',
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const apiKey = process.env.FISH_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Server misconfiguration: missing FISH_API_KEY' })
    }

    const { text } = req.body || {}
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Missing or empty "text" field' })
    }

    // Sanitise + cap length
    const input = formatForTTS(String(text).trim())

    const fishResp = await fetch(FISH_API_URL, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        model:          FISH_MODEL_HEADER,   // required Fish header
      },
      body: JSON.stringify({
        text:         input,
        reference_id: FISH_REFERENCE_ID,     // correct field name
        format:       'mp3',
        mp3_bitrate:  128,
        latency:      'normal',
      }),
    })

    if (!fishResp.ok) {
      const details = await fishResp.text()
      console.error(`[tts] Fish error ${fishResp.status}:`, details)
      return res.status(fishResp.status).json({
        error:   `Fish Audio error (${fishResp.status})`,
        details: details.slice(0, 500),
      })
    }

    const audioBuffer = Buffer.from(await fishResp.arrayBuffer())

    res.setHeader('Content-Type',  'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(audioBuffer)

  } catch (err) {
    console.error('[tts] Unhandled error:', err)
    return res.status(500).json({ error: err.message || 'TTS failed' })
  }
}

// ---------------------------------------------------------------------------
// TTS script formatter
// ---------------------------------------------------------------------------
/**
 * Post-processes plain text so it sounds natural via Fish S2-Pro:
 *  1. Trims and caps length.
 *  2. Converts double line-breaks → (break).
 *  3. Inserts (break) after every 2 sentences (max 6 breaks total).
 *  4. Strips excessive markdown that sounds bad when spoken.
 *
 * Emotion tags like [cheerful] already in the text are preserved unchanged.
 */
function formatForTTS(raw) {
  // 1. Cap length
  let t = raw.slice(0, MAX_TEXT_LENGTH)

  // 2. Strip triple backticks code blocks (spoken as noise)
  t = t.replace(/```[\s\S]*?```/g, ' (break) ')

  // 3. Strip inline code backticks
  t = t.replace(/`[^`]+`/g, (m) => m.replace(/`/g, ''))

  // 4. Strip markdown headings
  t = t.replace(/^#{1,6}\s+/gm, '')

  // 5. Convert bullet points to readable form
  t = t.replace(/^\s*[-*]\s+/gm, '')

  // 6. Double line-breaks → (break)
  t = t.replace(/\n{2,}/g, ' (break) ')

  // 7. Single line-breaks → space
  t = t.replace(/\n/g, ' ')

  // 8. Insert (break) every ~2 sentences (simple heuristic)
  t = insertSentenceBreaks(t, { everyN: 2, maxBreaks: 6 })

  // 9. Normalise repeated whitespace / duplicate breaks
  t = t.replace(/(\(break\)\s*){3,}/g, ' (break) ')
  t = t.replace(/\s{2,}/g, ' ').trim()

  return t
}

function insertSentenceBreaks(text, { everyN, maxBreaks }) {
  // Split on sentence-ending punctuation but keep the punctuation
  const sentences = text.split(/(?<=[.!?])\s+/)
  const result = []
  let breaksInserted = 0

  for (let i = 0; i < sentences.length; i++) {
    result.push(sentences[i])
    // Insert break every everyN sentences (but not at the very end)
    if (
      (i + 1) % everyN === 0 &&
      i < sentences.length - 1 &&
      breaksInserted < maxBreaks &&
      !sentences[i].includes('(break)')
    ) {
      result.push('(break)')
      breaksInserted++
    }
  }

  return result.join(' ')
}