import styles from './FlirtingGame.module.scss'
import { useFlirtingGameContext } from './context/FlirtingGameContext'

export function ScenarioCard() {
  const { currentScenario } = useFlirtingGameContext()
  if (!currentScenario) return null

  return (
    <div className="mb-4">
      <span className="Label Label--accent mb-3 d-inline-block">{currentScenario.venue}</span>
      <p className="f4 color-fg-muted mb-4">{currentScenario.setup}</p>
      <div className={`rounded-2 p-4 border color-bg-subtle f3 ${styles.chatBubble}`}>
        <span className="color-fg-default" style={{ fontStyle: 'italic' }}>
          {currentScenario.line}
        </span>
      </div>
    </div>
  )
}
