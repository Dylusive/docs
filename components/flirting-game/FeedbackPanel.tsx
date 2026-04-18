import styles from './FlirtingGame.module.scss'
import { useFlirtingGameContext } from './context/FlirtingGameContext'

function getCalloutClass(score: number): string {
  if (score < 30) return 'color-bg-danger-subtle border-color-danger-emphasis'
  if (score < 70) return 'color-bg-accent-subtle border-color-accent-emphasis'
  return 'color-bg-success-subtle border-color-success-emphasis'
}

function getCalloutIcon(score: number): string {
  if (score < 30) return '💀'
  if (score < 70) return '💬'
  return '🔥'
}

export function FeedbackPanel() {
  const { selectedOption, nextScenario, currentScenarioIndex, scenarios } = useFlirtingGameContext()
  if (!selectedOption) return null

  const isLast = currentScenarioIndex >= scenarios.length - 1

  return (
    <div className={`${styles.slideDown} rounded-2 border p-4 mt-4 ${getCalloutClass(selectedOption.score)}`}>
      <div className="d-flex flex-items-center mb-2" style={{ gap: 8 }}>
        <span style={{ fontSize: 20 }}>{getCalloutIcon(selectedOption.score)}</span>
        <span className="f2 text-bold color-fg-default">{selectedOption.score}</span>
        <span className="f5 color-fg-muted">/ 100 charm pts</span>
      </div>
      <p className="f4 color-fg-default mb-4">{selectedOption.feedback}</p>
      <button className="btn btn-primary" onClick={nextScenario}>
        {isLast ? 'See Your Mastery Level →' : 'Next Scenario →'}
      </button>
    </div>
  )
}
