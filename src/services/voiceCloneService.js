import { apiUrl } from '../lib/apiUrl.js'
/**
 * src/services/voiceCloneService.js
 *
 * Client-side service for the Voice Cloning Studio.
 * Communicates with /api/voice-clone and /api/voice-clone-preview.
 */

import { supabase } from '../lib/supabaseClient.js'

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${token}` }
}

// ── Model CRUD ─────────────────────────────────────────────────────────────

/**
 * List the current user's private voice models.
 * @returns {Promise<ModelEntity[]>}
 */
export async function listVoiceModels() {
  const headers = await authHeader()
  const resp = await fetch(apiUrl('/api/voice-clone'), { headers })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || 'Failed to list voices')
  return data.models || []
}

/**
 * Create (clone) a new voice model.
 * @param {{ title: string, samples: Array<{ audio: string, text: string }> }} params
 *   audio — base64-encoded WAV
 *   text  — transcript of the audio clip
 * @returns {Promise<ModelEntity>}
 */
export async function createVoiceModel({ title, samples }) {
  const headers = await authHeader()
  const resp = await fetch(apiUrl('/api/voice-clone'), {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, samples }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || 'Failed to create voice')
  return data.model
}

/**
 * Delete a voice model.
 * @param {string} id
 */
export async function deleteVoiceModel(id) {
  const headers = await authHeader()
  const resp = await fetch(apiUrl(`/api/voice-clone?id=${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers,
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || 'Failed to delete voice')
  return data
}

// ── TTS preview ────────────────────────────────────────────────────────────

/**
 * Generate a TTS preview for a given voice model.
 * Returns a temporary object URL for the resulting MP3.
 * @param {string} referenceId  – Fish Audio model _id
 * @param {string} text         – text to synthesize (max 500 chars)
 * @returns {Promise<string>}   – object URL
 */
export async function previewVoice(referenceId, text) {
  const headers = await authHeader()
  const resp = await fetch(apiUrl('/api/voice-clone-preview'), {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceId, text }),
  })
  if (resp.ok) {
    const blob = await resp.blob()
    return URL.createObjectURL(blob)
  }
  const err = await resp.json().catch(() => ({}))
  throw new Error(err.error || `Preview failed (${resp.status})`)
}

// ── Audio helpers ─────────────────────────────────────────────────────────

/** Read a Blob/File as raw base64 (no data-URL prefix). */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Failed to read audio file'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Re-encode any browser-recorded Blob to 16-bit PCM WAV.
 * Uses the Web Audio API — no external libraries needed.
 */
export async function convertToWav(blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const audioCtx = new AudioContext()
  let decoded
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer)
  } finally {
    audioCtx.close()
  }

  const numChannels = Math.min(decoded.numberOfChannels, 2)
  const sampleRate  = decoded.sampleRate
  const length      = decoded.length

  const channels = []
  for (let c = 0; c < numChannels; c++) channels.push(decoded.getChannelData(c))

  const interleaved = new Float32Array(length * numChannels)
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) interleaved[i * numChannels + c] = channels[c][i]
  }

  const dataLen = interleaved.length * 2
  const buf     = new ArrayBuffer(44 + dataLen)
  const view    = new DataView(buf)
  const write   = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }

  write(0, 'RIFF'); view.setUint32(4, 36 + dataLen, true); write(8, 'WAVE')
  write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true); view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, dataLen, true)

  let off = 44
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }

  return new Blob([buf], { type: 'audio/wav' })
}