export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function statusClass(state) {
  if (state === 'trained')  return 'vc-voice-status--trained'
  if (state === 'training' || state === 'created') return 'vc-voice-status--training'
  return 'vc-voice-status--failed'
}

export function statusLabel(state) {
  if (state === 'trained')  return '✓ Ready'
  if (state === 'training') return '⟳ Training'
  if (state === 'created')  return '⟳ Queued'
  return '✕ Failed'
}

// ── Waveform animation ────────────────────────────────────────────────────
