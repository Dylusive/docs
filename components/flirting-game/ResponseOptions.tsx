import { ResponseOption, ResponseStyle } from './types'
import { useFlirtingGameContext } from './context/FlirtingGameContext'

const styleLabelClass: Record<ResponseStyle, string> = {
  Safe: 'Label--secondary',
  Clever: 'Label--accent',
  Bold: 'Label--warning',
  Unhinged: 'Label--danger',
}

export function ResponseOptions() {
  const { currentScenario, gamePhase, selectedOption, selectOption } = useFlirtingGameContext()
  if (!currentScenario) return null

  const isPicked = gamePhase === 'feedback'

  return (
    <div className="d-flex flex-column" style={{ gap: 12 }}>
      {currentScenario.options.map((option: ResponseOption) => {
        const isSelected = selectedOption?.id === option.id
        return (
          <button
            key={option.id}
            disabled={isPicked}
            onClick={() => selectOption(option)}
            className={`btn text-left d-flex flex-items-start ${
              isSelected
                ? 'color-bg-accent-emphasis color-fg-on-emphasis border-0'
                : 'btn-outline color-fg-default'
            }`}
            style={{ gap: 10, padding: '12px 16px', lineHeight: 1.4, opacity: isPicked && !isSelected ? 0.45 : 1 }}
          >
            <span className={`Label ${styleLabelClass[option.style]}`} style={{ flexShrink: 0, marginTop: 2 }}>
              {option.style}
            </span>
            <span>{option.text}</span>
          </button>
        )
      })}
    </div>
  )
}
