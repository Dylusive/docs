import { MasteryLevel } from './types'
import { useFlirtingGameContext } from './context/FlirtingGameContext'

function getMasteryLevel(score: number): MasteryLevel {
  if (score <= 100) return 'Awkward Penguin'
  if (score <= 200) return 'Smooth Operator'
  if (score <= 320) return 'Silver-Tongued Devil'
  if (score <= 430) return 'Legendary Casanova'
  return 'Cosmic Flirt God'
}

const masteryEmoji: Record<MasteryLevel, string> = {
  'Awkward Penguin': '🐧',
  'Smooth Operator': '😎',
  'Silver-Tongued Devil': '😈',
  'Legendary Casanova': '💫',
  'Cosmic Flirt God': '✨',
}

const masteryFlavor: Record<MasteryLevel, string> = {
  'Awkward Penguin': 'You tried. Truly. The penguins are proud of you.',
  'Smooth Operator': "You've got the basics down. People are mildly charmed. Keep pushing.",
  'Silver-Tongued Devil': 'Dangerous wit, lethal timing. They never saw you coming.',
  'Legendary Casanova': "You're the main character and everyone in the room knows it.",
  'Cosmic Flirt God': 'You don\'t flirt. You rearrange the fabric of reality.',
}

export function EndScreen() {
  const { totalScore, completedAnswers, scenarios, restartGame } = useFlirtingGameContext()
  const maxScore = scenarios.reduce((sum, s) => sum + Math.max(...s.options.map((o) => o.score)), 0)
  const level = getMasteryLevel(totalScore)

  return (
    <div className="text-center py-6">
      <div style={{ fontSize: 64, marginBottom: 12 }}>{masteryEmoji[level]}</div>
      <h1 className="h1 mb-2">{level}</h1>
      <p className="f3 color-fg-muted mb-4">{masteryFlavor[level]}</p>

      <div className="border rounded-2 color-bg-subtle p-4 mb-5 mx-auto" style={{ maxWidth: 400 }}>
        <p className="f2 text-bold color-fg-default mb-1">
          {totalScore} <span className="f4 color-fg-muted">/ {maxScore}</span>
        </p>
        <p className="f5 color-fg-muted mb-0">Total Charm Points</p>
      </div>

      <div className="border rounded-2 color-bg-subtle p-4 mb-5 text-left mx-auto" style={{ maxWidth: 480 }}>
        <p className="f5 text-bold color-fg-muted mb-3">SCORECARD</p>
        {completedAnswers.map((answer, i) => {
          const scenario = scenarios.find((s) => s.id === answer.scenarioId)
          const option = scenario?.options.find((o) => o.id === answer.chosenOptionId)
          if (!scenario || !option) return null
          return (
            <div
              key={answer.scenarioId}
              className="d-flex flex-justify-between flex-items-center py-2 border-bottom"
            >
              <div>
                <span className="f6 text-bold color-fg-default">
                  {i + 1}. {scenario.venue}
                </span>
                <span className="Label Label--secondary ml-2 f6">{option.style}</span>
              </div>
              <span className="f5 text-bold color-fg-default">{answer.score}</span>
            </div>
          )
        })}
      </div>

      <button className="btn btn-primary btn-large" onClick={restartGame}>
        Play Again
      </button>
    </div>
  )
}
