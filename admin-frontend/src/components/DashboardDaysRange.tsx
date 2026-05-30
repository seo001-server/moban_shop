export type DashboardDays = 7 | 30 | 90

const OPTIONS: DashboardDays[] = [7, 30, 90]

type Props = {
  value: DashboardDays
  onChange: (days: DashboardDays) => void
  label?: string
}

export function DashboardDaysRange({ value, onChange, label }: Props) {
  return (
    <div className="dashboard-days-range" role="group" aria-label={label ?? '日期范围'}>
      {OPTIONS.map((d) => (
        <button
          key={d}
          type="button"
          className={`dashboard-days-range__btn${value === d ? ' is-active' : ''}`}
          aria-pressed={value === d}
          onClick={() => onChange(d)}
        >
          {d}日
        </button>
      ))}
    </div>
  )
}
