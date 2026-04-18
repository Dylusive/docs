import { SimpleHeader, SimpleFooter } from 'components/GenericError'
import { useFlirtingGameContext } from './context/FlirtingGameContext'
import { ProgressBar } from './ProgressBar'
import { WittyOMeter } from './WittyOMeter'
import { ScenarioCard } from './ScenarioCard'
import { ResponseOptions } from './ResponseOptions'
import { FeedbackPanel } from './FeedbackPanel'
import { EndScreen } from './EndScreen'

function IntroScreen() {
  const { startGame } = useFlirtingGameContext()
  return (
    <div className="text-center py-9">
      <p style={{ fontSize: 56, marginBottom: 16 }}>💘</p>
      <h1 className="h1 mb-3">The Flirting Game</h1>
      <p className="f3 color-fg-muted mb-2" style={{ maxWidth: 520, margin: '0 auto 16px' }}>
        Five scenarios. Four choices. One chance to go from <em>Awkward Penguin</em> to{' '}
        <em>Cosmic Flirt God</em>.
      </p>
      <p className="f5 color-fg-muted mb-5" style={{ maxWidth: 460, margin: '0 auto 32px' }}>
        Practice your wordplay. Push the boundary. Be slick, sly, and devastatingly clever — or
        gloriously unhinged. The universe is watching.
      </p>
      <button className="btn btn-primary btn-large" onClick={startGame}>
        Start Game →
      </button>
    </div>
  )
}

function FlirtingGameInner() {
  const { gamePhase, currentScenarioIndex, scenarios, totalScore } = useFlirtingGameContext()
  const maxScore = scenarios.reduce(
    (sum, s) => sum + Math.max(...s.options.map((o) => o.score)),
    0
  )

  if (gamePhase === 'intro') return <IntroScreen />
  if (gamePhase === 'end') return <EndScreen />

  return (
    <div>
      <ProgressBar current={currentScenarioIndex + 1} total={scenarios.length} />
      <WittyOMeter score={totalScore} maxScore={maxScore} />
      <ScenarioCard />
      <ResponseOptions />
      <FeedbackPanel />
    </div>
  )
}

export function FlirtingGamePage() {
  return (
    <div className="min-h-screen d-flex flex-column">
      <SimpleHeader />
      <main className="flex-1 container-xl p-responsive py-6">
        <div className="col-md-8 col-lg-6 mx-auto">
          <FlirtingGameInner />
        </div>
      </main>
      <SimpleFooter />
    </div>
  )
}
