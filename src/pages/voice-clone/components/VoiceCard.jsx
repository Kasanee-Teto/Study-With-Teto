import { useEffect, useRef, useState } from 'react'
import { deleteVoiceModel, previewVoice } from '../../../services/voiceCloneService.js'
import { DEFAULT_PREVIEW } from '../constants.js'
import { formatDate, statusClass, statusLabel } from '../utils.js'

export default function VoiceCard({ model, onDeleted }) {
  const [previewText, setPreviewText]     = useState(DEFAULT_PREVIEW)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewUrl, setPreviewUrl]       = useState(null)
  const [previewError, setPreviewError]   = useState('')
  const [deleting, setDeleting]           = useState(false)
  const audioRef = useRef(null)
  const prevUrlRef = useRef(null)

  function releasePrev() {
    if (prevUrlRef.current) { URL.revokeObjectURL(prevUrlRef.current); prevUrlRef.current = null }
  }

  useEffect(() => () => releasePrev(), [])

  async function handlePreview() {
    if (!previewText.trim() || model.state !== 'trained') return
    setPreviewLoading(true)
    setPreviewError('')
    releasePrev()
    try {
      const url = await previewVoice(model._id, previewText.trim())
      prevUrlRef.current = url
      setPreviewUrl(url)
      setTimeout(() => audioRef.current?.play().catch(() => {}), 50)
    } catch (err) {
      setPreviewError(err.message || 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete voice "${model.title}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteVoiceModel(model._id)
      onDeleted(model._id)
    } catch (err) {
      alert(err.message || 'Delete failed')
      setDeleting(false)
    }
  }

  const canPreview = model.state === 'trained'

  return (
    <div className="vc-voice-card">
      <div className="vc-voice-card-header">
        <div>
          <div className="vc-voice-name">{model.title || 'Untitled Voice'}</div>
          <div className="vc-voice-meta">Created {formatDate(model.created_at)}</div>
        </div>
        <span className={`vc-voice-status ${statusClass(model.state)}`}>
          {statusLabel(model.state)}
        </span>
      </div>

      {canPreview ? (
        <div className="vc-preview-area">
          <textarea
            className="vc-preview-input"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Type something to preview…"
            rows={2}
          />
          <div className="vc-preview-actions">
            <button
              className="vc-preview-btn"
              onClick={handlePreview}
              disabled={previewLoading || !previewText.trim()}
            >
              {previewLoading ? <span className="vc-spinner" /> : '▶'}
              {previewLoading ? ' Generating…' : ' Preview'}
            </button>
            <button className="vc-delete-btn" onClick={handleDelete} disabled={deleting}>
              {deleting ? <span className="vc-spinner" /> : '✕'} Delete
            </button>
          </div>

          {previewError && (
            <div className="vc-banner vc-banner--error">
              <span className="vc-banner-icon">⚠</span>{previewError}
            </div>
          )}

          {previewUrl && (
            <audio ref={audioRef} src={previewUrl} controls className="vc-audio-player" />
          )}
        </div>
      ) : (
        <div className="vc-preview-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="vc-delete-btn" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="vc-spinner" /> : '✕'} Delete
          </button>
        </div>
      )}
    </div>
  )
}
