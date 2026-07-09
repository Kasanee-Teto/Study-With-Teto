export default function LiveWaveform() {
  return (
    <div className="vc-waveform" aria-hidden="true">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="vc-waveform-bar" />
      ))}
    </div>
  )
}

// ── Sample slot ────────────────────────────────────────────────────────────
