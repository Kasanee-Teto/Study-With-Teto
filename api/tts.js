const FISH_MODEL_ID = 'a3b3f0a9c49340bd8fa722d83c81cb08'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const apiKey = process.env.FISH_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing FISH_API_KEY' })
    }

    const { text } = req.body || {}
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Missing text' })
    }

    const input = String(text).trim().slice(0, 3000)

    const fishResp = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        text: input,
        model_id: FISH_MODEL_ID,
        format: 'mp3'
      })
    })

    if (!fishResp.ok) {
      const details = await fishResp.text()
      return res.status(fishResp.status).json({
        error: `Fish Audio error (${fishResp.status})`,
        details
      })
    }

    const audioBuffer = Buffer.from(await fishResp.arrayBuffer())

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(audioBuffer)
  } catch (error) {
    return res.status(500).json({ error: error.message || 'TTS failed' })
  }
}