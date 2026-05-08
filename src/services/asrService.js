/**
 * src/services/asrService.js
 *
 * Converts a recorded audio Blob → Indonesian transcript text.
 * Sends audio as base64 JSON to avoid multipart complexity in the proxy.
 *
 * Key fix: browsers record as audio/webm;codecs=opus which Fish ASR rejects
 * ("unsupported codec"). We detect that case and re-encode to WAV (PCM 16-bit)
 * via the Web Audio API before uploading — WAV is universally accepted by Fish.
 *
 * Usage:
 *   const { text } = await transcribeAudio(audioBlob, 'audio/webm;codecs=opus')
 */

import { supabase } from '../lib/supabaseClient.js'

const MAX_RECORDING_BYTES = 25 * 1024 * 1024 // 25 MB

// MIME types Fish ASR natively handles without conversion
const FISH_SUPPORTED_BASE_TYPES = new Set([
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
])

/**
 * Returns the base MIME type without codec parameters.
 * e.g. 'audio/webm;codecs=opus' → 'audio/webm'
 */
function baseMimeType(mimeType) {
  return (mimeType || '').split(';')[0].trim().toLowerCase()
}

/**
 * Returns true when Fish ASR can handle this type natively.
 * Fish rejects the opus codec in any container (webm, mp4, ogg+opus…),
 * so we check for it explicitly before trusting the base MIME type.
 */
function fishSupports(mimeType) {
  const lower = (mimeType || '').toLowerCase()
  if (lower.includes('opus')) return false          // opus = always convert
  if (lower.includes('webm')) return false          // webm without opus still risky
  return FISH_SUPPORTED_BASE_TYPES.has(baseMimeType(lower))
}

// ---------------------------------------------------------------------------
// WAV encoder (browser-side, no dependencies)
// ---------------------------------------------------------------------------

/**
 * Decode any browser-recorded Blob to a 16-bit mono/stereo WAV Blob.
 * Uses the Web Audio API which can always decode whatever the browser recorded.
 */
async function convertToWav(blob) {
  const arrayBuffer = await blob.arrayBuffer()

  // AudioContext decodes the raw container (webm, ogg, mp4…) regardless of codec
  const audioCtx    = new AudioContext()
  let audioBuffer
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  } finally {
    audioCtx.close()
  }

  const wavBuffer = encodeWav(audioBuffer)
  return new Blob([wavBuffer], { type: 'audio/wav' })
}

/**
 * Encode an AudioBuffer to a WAV ArrayBuffer (PCM 16-bit, little-endian).
 */
function encodeWav(audioBuffer) {
  const numChannels = Math.min(audioBuffer.numberOfChannels, 2) // cap at stereo
  const sampleRate  = audioBuffer.sampleRate
  const bitDepth    = 16
  const bytesPerSample = bitDepth / 8

  // Interleave channels
  const channelData = []
  for (let c = 0; c < numChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c))
  }
  const frameCount  = audioBuffer.length
  const interleaved = new Float32Array(frameCount * numChannels)
  for (let i = 0; i < frameCount; i++) {
    for (let c = 0; c < numChannels; c++) {
      interleaved[i * numChannels + c] = channelData[c][i]
    }
  }

  const dataLength   = interleaved.length * bytesPerSample
  const headerLength = 44
  const wavBuffer    = new ArrayBuffer(headerLength + dataLength)
  const view         = new DataView(wavBuffer)

  function writeStr(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  // RIFF chunk
  writeStr(0, 'RIFF')
  view.setUint32(4,  36 + dataLength, true)
  writeStr(8, 'WAVE')

  // fmt sub-chunk
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)                                      // PCM sub-chunk size
  view.setUint16(20, 1,  true)                                      // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true) // byte rate
  view.setUint16(32, numChannels * bytesPerSample, true)              // block align
  view.setUint16(34, bitDepth, true)

  // data sub-chunk
  writeStr(36, 'data')
  view.setUint32(40, dataLength, true)

  // PCM samples (float32 → int16)
  let offset = 44
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return wavBuffer
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Transcribe an audio Blob using Fish ASR via /api/asr.
 * Automatically converts unsupported formats (e.g. webm+opus) to WAV first.
 *
 * @param {Blob}   audioBlob  – recorded audio blob from MediaRecorder
 * @param {string} mimeType   – MIME type of the blob (e.g. 'audio/webm;codecs=opus')
 * @returns {Promise<{ text: string, duration: number, segments: any[] }>}
 */
export async function transcribeAudio(audioBlob, mimeType = 'audio/webm') {
  if (!(audioBlob instanceof Blob)) {
    throw new TypeError('"audioBlob" must be a Blob')
  }
  if (audioBlob.size === 0) {
    throw new Error('Audio blob is empty — nothing was recorded')
  }
  if (audioBlob.size > MAX_RECORDING_BYTES) {
    throw new Error('Recording is too large (max 25 MB)')
  }

  // Convert to WAV if Fish won't accept the recorded format
  let uploadBlob = audioBlob
  let uploadMime = mimeType

  if (!fishSupports(mimeType)) {
    console.info(`[asr] converting ${mimeType} → audio/wav for Fish compatibility`)
    try {
      uploadBlob = await convertToWav(audioBlob)
      uploadMime = 'audio/wav'
    } catch (convErr) {
      console.warn('[asr] WAV conversion failed, sending original:', convErr)
      // Fall through — let the server return a descriptive error
    }
  }

  const base64 = await blobToBase64(uploadBlob)

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const resp = await fetch('/api/asr', {
    method:  'POST',
    headers,
    body:    JSON.stringify({ audio: base64, mimeType: uploadMime }),
  })

  let data
  try {
    data = await resp.json()
  } catch {
    data = {}
  }

  if (!resp.ok) {
    throw new Error(
      data?.error || data?.details || `ASR request failed (HTTP ${resp.status})`
    )
  }

  return {
    text:     data.text     || '',
    duration: data.duration || 0,
    segments: data.segments || [],
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a Blob as a base64 data-URL, then strip the prefix to get raw base64 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(/** @type {string} */ (reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Failed to read audio blob'))
    reader.readAsDataURL(blob)
  })
}

// ---------------------------------------------------------------------------
// MediaRecorder helpers
// ---------------------------------------------------------------------------

/**
 * Best-effort MIME type selection for MediaRecorder.
 *
 * Priority: formats Fish ASR supports natively → webm as last resort.
 * Even if we end up with webm, transcribeAudio() will convert it to WAV.
 */
export function preferredMimeType() {
  const types = [
    'audio/ogg;codecs=opus',  // Firefox
    'audio/ogg',
    'audio/mp4',              // Safari / some Chromium builds
    'audio/wav',
    'audio/webm;codecs=opus', // Chrome default — will be converted client-side
    'audio/webm',
  ]
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return '' // browser will choose; convertToWav handles whatever it picks
}

/**
 * Start recording from the default microphone.
 *
 * Returns:
 *   { recorder, stop, stream }
 *
 *   stop() → Promise<{ blob, mimeType }>
 */
export async function startRecording() {
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  } catch (err) {
    throw new Error(`Microphone access denied: ${err.message}`)
  }

  const mimeType = preferredMimeType()
  const options  = mimeType ? { mimeType } : {}
  const recorder = new MediaRecorder(stream, options)
  const chunks   = []

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  recorder.start(250) // collect chunks every 250 ms

  const stop = () =>
    new Promise((resolve, reject) => {
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())

        const effectiveMime = recorder.mimeType || mimeType || 'audio/webm'
        const blob          = new Blob(chunks, { type: effectiveMime })
        resolve({ blob, mimeType: effectiveMime })
      }
      recorder.onerror = (e) => reject(e.error || new Error('Recording error'))
      recorder.stop()
    })

  return { recorder, stop, stream }
}