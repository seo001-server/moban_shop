import type { TopProductSales } from '../api/types'
import { DashboardDaysRange, type DashboardDays } from './DashboardDaysRange'

type Props = {
  items: TopProductSales[]
  days: DashboardDays
  onDaysChange: (days: DashboardDays) => void
}

export default function DashboardTopProducts({ items, days, onDaysChange }: Props) {
  const maxQty = Math.max(...items.map((item) => item.sales_qty), 1)

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div className="dashboard-panel__head-row">
          <h3 className="dashboard-panel__title">模板销量 TOP5</h3>
          <p className="dashboard-panel__meta">近 {days} 日已支付订单销量</p>
        </div>
        <DashboardDaysRange value={days} onChange={onDaysChange} label="模板销量日期范围" />
      </div>

      {items.length === 0 ? (
        <div className="dashboard-panel__empty">
          <p>暂无销量数据</p>
          <span className="muted small">该时间范围内无已支付订单</span>
        </div>
      ) : (
        <ul className="dashboard-top-list">
          {items.map((item, index) => {
            const widthPct = Math.max(6, (item.sales_qty / maxQty) * 100)
            return (
              <li key={item.product_id} className="dashboard-top-list__item">
                <div className="dashboard-top-list__rank">{index + 1}</div>
                <div className="dashboard-top-list__body">
                  <div className="dashboard-top-list__row">
                    <span className="dashboard-top-list__title" title={item.product_title}>
                      {item.product_title}
                    </span>
                    <span className="dashboard-top-list__qty">{item.sales_qty} 件</span>
                  </div>
                  <div className="dashboard-top-list__track">
                    <div className="dashboard-top-list__bar" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
