/**
 * src/services/translateService.js
 *
 * Translates Indonesian text to English via /api/translate → LibreTranslate.
 *
 * Usage:
 *   const { translatedText } = await translateIdToEn('Halo, apa kabar?')
 */

/**
 * Translate text from Indonesian to English.
 *
 * @param {string} text        – source text (Indonesian)
 * @param {string} [source]    – source language code (default 'id')
 * @param {string} [target]    – target language code (default 'en')
 * @returns {Promise<{ translatedText: string }>}
 */
export async function translateIdToEn(text, source = 'id', target = 'en') {
  if (!text || !String(text).trim()) {
    return { translatedText: '' }
  }

  const resp = await fetch('/api/translate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text: String(text).trim(), source, target }),
  })

  let data
  try {
    data = await resp.json()
  } catch {
    data = {}
  }

  if (!resp.ok) {
    throw new Error(
      data?.error || data?.details || `Translation failed (HTTP ${resp.status})`
    )
  }

  return { translatedText: data.translatedText || '' }
}