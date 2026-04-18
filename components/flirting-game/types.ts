export type ResponseStyle = 'Safe' | 'Clever' | 'Bold' | 'Unhinged'
export type GamePhase = 'intro' | 'scenario' | 'feedback' | 'end'
export type MasteryLevel =
  | 'Awkward Penguin'
  | 'Smooth Operator'
  | 'Silver-Tongued Devil'
  | 'Legendary Casanova'
  | 'Cosmic Flirt God'

export interface ResponseOption {
  id: string
  text: string
  style: ResponseStyle
  feedback: string
  score: number
}

export interface Scenario {
  id: string
  venue: string
  setup: string
  line: string
  options: ResponseOption[]
}

export interface CompletedAnswer {
  scenarioId: string
  chosenOptionId: string
  score: number
}
