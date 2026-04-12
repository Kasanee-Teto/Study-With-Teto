export async function synthesizeSpeech(text) {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })

  if (response.ok) {
    const audioBlob = await response.blob()
    return {
      mode: 'audio',
      url: URL.createObjectURL(audioBlob)
    }
  }

  let details = ''
  try {
    const err = await response.json()
    details = err?.details || err?.error || ''
  } catch {
    // ignore parse failure
  }

  // Fish billing/quota issue, or any server failure => fallback
  return {
    mode: 'browser-tts',
    error: `Fish TTS unavailable (${response.status})${details ? `: ${details}` : ''}`
  }
}