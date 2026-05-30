import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/http'
import { adminApiFetch } from '../api/adminHttp'
import type { DashboardData } from '../api/types'
import type { DashboardDays } from '../components/DashboardDaysRange'
import DashboardDailyChart from '../components/DashboardDailyChart'
import DashboardTopProducts from '../components/DashboardTopProducts'
import { formatMoney } from '../utils/format'

function StatCard({
  label,
  value,
  hint,
  onClick,
}: {
  label: string
  value: string
  hint?: string
  onClick?: () => void
}) {
  const clickable = Boolean(onClick)
  return (
    <button
      type="button"
      className={`stat-card${clickable ? ' stat-card--link' : ''}`}
      onClick={onClick}
      disabled={!clickable}
    >
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {hint ? <span className="stat-card__hint">{hint}</span> : null}
    </button>
  )
}

export default function DashboardPage() {
  const nav = useNavigate()
  const [userDays, setUserDays] = useState<DashboardDays>(7)
  const [orderDays, setOrderDays] = useState<DashboardDays>(7)
  const [topDays, setTopDays] = useState<DashboardDays>(7)
  const [data, setData] = useState<DashboardData | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [trendsLoading, setTrendsLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setTrendsLoading(true)
    ;(async () => {
      try {
        const q = new URLSearchParams({
          user_days: String(userDays),
          order_days: String(orderDays),
          top_days: String(topDays),
        })
        const res = await adminApiFetch<DashboardData>(`/api/admin/dashboard?${q}`)
        if (alive) {
          setData(res)
          setErr(null)
        }
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError) {
          setErr(e.message)
        } else {
          setErr('加载失败')
        }
      } finally {
        if (alive) setTrendsLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [userDays, orderDays, topDays])

  if (err && !data) {
    return (
      <div className="page">
        <div className="alert alert--error" role="alert">
          {err}
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="loading-state">加载中…</div>
  }

  const { stats, trends } = data

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header__text">
          <h1>数据看板</h1>
          <p className="page-header__desc">商城运营概览</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="注册用户" value={String(stats.users_count)} onClick={() => nav('/users')} />
        <StatCard label="模板数量" value={String(stats.templates_count)} onClick={() => nav('/templates')} />
        <StatCard
          label="订单总数"
          value={String(stats.orders_count)}
          hint={`待处理 ${stats.orders_pending_count} · 已支付 ${stats.orders_paid_count}`}
          onClick={() => nav('/orders')}
        />
        <StatCard
          label="已支付收入"
          value={formatMoney(stats.revenue_minor, 'USD')}
          hint="按已支付订单汇总（最小货币单位）"
          onClick={() => nav('/orders?status=paid')}
        />
      </div>

      <div className="card dashboard-summary-card">
        <div className="card__body">
          <div className="dashboard-summary-grid">
            <div className="dashboard-summary-metric">
              <span className="dashboard-summary-metric__label">昨日新增用户</span>
              <span className="dashboard-summary-metric__value">{trends.summary.yesterday_users}</span>
            </div>
            <div className="dashboard-summary-metric">
              <span className="dashboard-summary-metric__label">昨日新增订单</span>
              <span className="dashboard-summary-metric__value">{trends.summary.yesterday_orders}</span>
            </div>
            <div className="dashboard-summary-metric">
              <span className="dashboard-summary-metric__label">今日新增用户</span>
              <span className="dashboard-summary-metric__value">{trends.summary.today_users}</span>
            </div>
            <div className="dashboard-summary-metric">
              <span className="dashboard-summary-metric__label">今日新增订单</span>
              <span className="dashboard-summary-metric__value">{trends.summary.today_orders}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`dashboard-charts-grid${trendsLoading ? ' dashboard-charts-grid--loading' : ''}`}>
        <div className="card dashboard-chart-card dashboard-chart-card--bar">
          <div className="card__body">
            <DashboardDailyChart
              title="新增用户"
              series={trends.users}
              days={userDays}
              onDaysChange={setUserDays}
              color="#2563eb"
              colorMuted="#93c5fd"
            />
          </div>
        </div>

        <div className="card dashboard-chart-card dashboard-chart-card--bar">
          <div className="card__body">
            <DashboardDailyChart
              title="新增订单"
              series={trends.orders}
              days={orderDays}
              onDaysChange={setOrderDays}
              color="#059669"
              colorMuted="#6ee7b7"
            />
          </div>
        </div>

        <div className="card dashboard-chart-card">
          <div className="card__body">
            <DashboardTopProducts
              items={trends.top_products ?? []}
              days={topDays}
              onDaysChange={setTopDays}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
