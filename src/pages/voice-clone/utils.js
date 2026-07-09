export function formatDate(iso) {
  if (!iso) return '-'

  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function statusClass(state) {
  if (state === 'trained') return 'vc-voice-status--trained'
  if (state === 'training' || state === 'created') return 'vc-voice-status--training'
  return 'vc-voice-status--failed'
}

export function statusIcon(state) {
  if (state === 'trained') return '\u2713'
  if (state === 'training' || state === 'created') return '\u27F3'
  return '\u2715'
}

export function statusLabelKey(state) {
  if (state === 'trained') return 'voiceClone.statusReady'
  if (state === 'training') return 'voiceClone.statusTraining'
  if (state === 'created') return 'voiceClone.statusQueued'
  return 'voiceClone.statusFailed'
}
