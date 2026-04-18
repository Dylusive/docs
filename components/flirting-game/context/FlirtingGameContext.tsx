import React, { createContext, useContext, useState } from 'react'
import { GamePhase, ResponseOption, CompletedAnswer, Scenario } from '../types'
import { scenarios } from '../data/scenarios'

type FlirtingGameContextT = {
  currentScenarioIndex: number
  gamePhase: GamePhase
  selectedOption: ResponseOption | null
  completedAnswers: CompletedAnswer[]
  totalScore: number
  currentScenario: Scenario | undefined
  scenarios: Scenario[]
  startGame: () => void
  selectOption: (option: ResponseOption) => void
  nextScenario: () => void
  restartGame: () => void
}

export const FlirtingGameContext = createContext<FlirtingGameContextT | null>(null)

export const useFlirtingGameContext = (): FlirtingGameContextT => {
  const context = useContext(FlirtingGameContext)
  if (!context) {
    throw new Error('"useFlirtingGameContext" may only be used inside "FlirtingGameContext.Provider"')
  }
  return context
}

export const FlirtingGameContextProvider = (props: { children: React.ReactNode }) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('intro')
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<ResponseOption | null>(null)
  const [completedAnswers, setCompletedAnswers] = useState<CompletedAnswer[]>([])

  const totalScore = completedAnswers.reduce((sum, a) => sum + a.score, 0)
  const currentScenario = scenarios[currentScenarioIndex]

  const startGame = () => {
    setGamePhase('scenario')
  }

  const selectOption = (option: ResponseOption) => {
    setSelectedOption(option)
    setCompletedAnswers((prev) => [
      ...prev,
      { scenarioId: currentScenario.id, chosenOptionId: option.id, score: option.score },
    ])
    setGamePhase('feedback')
  }

  const nextScenario = () => {
    const nextIndex = currentScenarioIndex + 1
    if (nextIndex >= scenarios.length) {
      setGamePhase('end')
    } else {
      setCurrentScenarioIndex(nextIndex)
      setSelectedOption(null)
      setGamePhase('scenario')
    }
  }

  const restartGame = () => {
    setGamePhase('intro')
    setCurrentScenarioIndex(0)
    setSelectedOption(null)
    setCompletedAnswers([])
  }

  const context: FlirtingGameContextT = {
    currentScenarioIndex,
    gamePhase,
    selectedOption,
    completedAnswers,
    totalScore,
    currentScenario,
    scenarios,
    startGame,
    selectOption,
    nextScenario,
    restartGame,
  }

  return (
    <FlirtingGameContext.Provider value={context}>{props.children}</FlirtingGameContext.Provider>
  )
}
