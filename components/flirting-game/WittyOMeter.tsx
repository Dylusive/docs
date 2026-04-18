interface Props {
  score: number
  maxScore: number
}

function getTierLabel(score: number, maxScore: number): string {
  const pct = score / maxScore
  if (pct < 0.2) return 'Still warming up...'
  if (pct < 0.45) return 'Getting warmer 🌶'
  if (pct < 0.7) return 'Oh, you\'re dangerous'
  if (pct < 0.9) return 'Silver tongue detected'
  return '✨ LEGENDARY ✨'
}

export function WittyOMeter({ score, maxScore }: Props) {
  const percentage = Math.min(100, Math.round((score / maxScore) * 100))
  const label = getTierLabel(score, maxScore)

  return (
    <div className="border rounded-2 color-bg-subtle p-3 mb-4">
      <div className="d-flex flex-justify-between mb-2">
        <span className="f6 text-bold color-fg-default">Witty-O-Meter</span>
        <span className="f6 color-fg-muted">
          {score} / {maxScore} charm pts
        </span>
      </div>
      <div
        className="rounded-2 border color-bg-default"
        style={{ height: 12, overflow: 'hidden' }}
      >
        <div
          className="color-bg-accent-emphasis rounded-2"
          style={{ width: `${percentage}%`, height: '100%', transition: 'width 0.4s ease' }}
        />
      </div>
      <p className="f6 color-fg-muted mt-2 mb-0 text-center">{label}</p>
    </div>
  )
}
