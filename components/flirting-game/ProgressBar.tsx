interface Props {
  current: number
  total: number
}

export function ProgressBar({ current, total }: Props) {
  return (
    <div className="d-flex flex-items-center flex-justify-between mb-3">
      <span className="f6 color-fg-muted">
        Scenario {current} of {total}
      </span>
      <div className="d-flex" style={{ gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`d-inline-block rounded-circle ${
              i < current ? 'color-bg-accent-emphasis' : 'color-bg-subtle border'
            }`}
            style={{ width: 10, height: 10 }}
          />
        ))}
      </div>
    </div>
  )
}
