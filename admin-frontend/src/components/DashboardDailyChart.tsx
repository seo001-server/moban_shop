import { useEffect, useMemo, useRef, useState } from 'react'
import type { DailyCount } from '../api/types'
import { DashboardDaysRange, type DashboardDays } from './DashboardDaysRange'

type Props = {
  title: string
  series: DailyCount[]
  days: DashboardDays
  onDaysChange: (days: DashboardDays) => void
  color: string
  colorMuted: string
}

function formatDayLabel(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

function buildFallbackSeries(days: number): DailyCount[] {
  const out: DailyCount[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push({ date: `${y}-${m}-${day}`, count: 0 })
  }
  return out
}

export default function DashboardDailyChart({
  title,
  series,
  days,
  onDaysChange,
  color,
  colorMuted,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [plotWidth, setPlotWidth] = useState(280)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      setPlotWidth(Math.max(220, w - 8))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const data = series.length > 0 ? series : buildFallbackSeries(days)

  const maxCount = useMemo(() => {
    let max = 0
    for (const item of data) max = Math.max(max, item.count)
    return Math.max(max, 1)
  }, [data])

  const yTicks = useMemo(() => {
    const step = maxCount <= 5 ? 1 : Math.ceil(maxCount / 4)
    const ticks: number[] = []
    for (let v = 0; v <= maxCount; v += step) ticks.push(v)
    if (ticks[ticks.length - 1] !== maxCount) ticks.push(maxCount)
    return ticks
  }, [maxCount])

  const chartHeight = 200
  const paddingLeft = 30
  const paddingRight = 8
  const paddingTop = 8
  const paddingBottom = 28
  const chartWidth = paddingLeft + plotWidth + paddingRight
  const svgHeight = chartHeight + paddingTop + paddingBottom
  const barWidth = Math.min(40, Math.floor((plotWidth / data.length) * 0.62))
  const slotWidth = plotWidth / data.length

  const barHeight = (count: number) => {
    if (count <= 0) return 4
    return Math.max(6, (count / maxCount) * chartHeight)
  }

  const barX = (index: number) => paddingLeft + index * slotWidth + (slotWidth - barWidth) / 2

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div className="dashboard-panel__head-row">
          <h3 className="dashboard-panel__title">{title}</h3>
          <p className="dashboard-panel__meta">近 {days} 日趋势</p>
        </div>
        <DashboardDaysRange value={days} onChange={onDaysChange} label={`${title}日期范围`} />
      </div>
      <div className="dashboard-panel__chart-wrap" ref={wrapRef}>
        <svg
          className="dashboard-panel__chart"
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${chartWidth} ${svgHeight}`}
          role="img"
          aria-label={`${title}近 ${days} 日趋势`}
        >
          <rect
            x={paddingLeft}
            y={paddingTop}
            width={plotWidth}
            height={chartHeight}
            rx={8}
            fill="#f8fafc"
            stroke="#e2e8f0"
          />

          {yTicks.map((tick) => {
            const y = paddingTop + chartHeight - (tick / maxCount) * chartHeight
            return (
              <g key={tick}>
                <line x1={paddingLeft} y1={y} x2={paddingLeft + plotWidth} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                <text x={paddingLeft - 6} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">
                  {tick}
                </text>
              </g>
            )
          })}

          {data.map((item, index) => {
            const x = barX(index)
            const barH = barHeight(item.count)
            const baseY = paddingTop + chartHeight
            const barY = baseY - barH

            return (
              <g key={item.date}>
                <rect
                  x={x}
                  y={barY}
                  width={barWidth}
                  height={barH}
                  rx={4}
                  fill={item.count > 0 ? color : colorMuted}
                  opacity={item.count > 0 ? 1 : 0.65}
                />
                <text x={x + barWidth / 2} y={baseY + 18} fill="#64748b" fontSize="10" textAnchor="middle">
                  {formatDayLabel(item.date)}
                </text>
                {item.count > 0 ? (
                  <text x={x + barWidth / 2} y={barY - 5} fill="#475569" fontSize="10" textAnchor="middle">
                    {item.count}
                  </text>
                ) : null}
              </g>
            )
          })}

          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={paddingLeft + plotWidth}
            y2={paddingTop + chartHeight}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  )
}
