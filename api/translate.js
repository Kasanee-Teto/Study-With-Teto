/**
 * api/translate.js — LibreTranslate proxy (ID → EN)
 *
 * Accepts:  POST application/json  { text: string, source?: string, target?: string }
 * Returns:  JSON { translatedText }
 *
 * Environment variables required:
 *   LIBRETRANSLATE_URL      – e.g. https://translate.yourhost.com
 *   LIBRETRANSLATE_API_KEY  – optional; only if your LT instance requires it
 */

const DEFAULT_SOURCE = 'id'
const DEFAULT_TARGET = 'en'
const MAX_TEXT_LENGTH = 10_000

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const ltUrl = process.env.LIBRETRANSLATE_URL
    if (!ltUrl) {
      return res.status(500).json({ error: 'Server misconfiguration: missing LIBRETRANSLATE_URL' })
    }

    const {
      text,
      source = DEFAULT_SOURCE,
      target = DEFAULT_TARGET,
    } = req.body || {}

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Missing or empty "text" field' })
    }

    const input = String(text).trim().slice(0, MAX_TEXT_LENGTH)

    // Build LibreTranslate request body
    const ltBody = {
      q:       input,
      source:  source,
      target:  target,
      format:  'text',
    }

    // Only include api_key if it is configured
    const ltApiKey = process.env.LIBRETRANSLATE_API_KEY
    if (ltApiKey) {
      ltBody.api_key = ltApiKey
    }

    const ltResp = await fetch(`${ltUrl}/translate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(ltBody),
    })

    if (!ltResp.ok) {
      const details = await ltResp.text()
      console.error(`[translate] LibreTranslate error ${ltResp.status}:`, details)
      return res.status(ltResp.status).json({
        error:   `Translation service error (${ltResp.status})`,
        details: details.slice(0, 500),
      })
    }

    const data = await ltResp.json()

    if (!data?.translatedText) {
      return res.status(502).json({ error: 'Invalid response from translation service' })
    }

    return res.status(200).json({ translatedText: data.translatedText })

  } catch (err) {
    console.error('[translate] Unhandled error:', err)
    return res.status(500).json({ error: err.message || 'Translation failed' })
  }
}