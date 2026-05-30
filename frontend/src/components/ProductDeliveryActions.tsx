import { Link } from 'react-router-dom'
import type { OrderItem } from '../api/types'

type Props = {
  item: OrderItem
  paid: boolean
  compact?: boolean
}

export function ProductDeliveryActions({ item, paid, compact }: Props) {
  if (!paid) {
    return <span className="muted small">支付完成后可查看交付资源</span>
  }

  return (
    <div className={`product-delivery-actions${compact ? ' is-compact' : ''}`}>
      {item.preview_url ? (
        <a
          href={item.preview_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-delivery"
        >
          <i className="fas fa-eye" aria-hidden /> 查看演示
        </a>
      ) : null}
      <Link to={`/products/${item.product_id}`} className="btn btn-secondary btn-delivery">
        <i className="fas fa-layer-group" aria-hidden /> 模板详情
      </Link>
      <Link to="/docs" className="btn btn-secondary btn-delivery">
        <i className="fas fa-book" aria-hidden /> 部署文档
      </Link>
    </div>
  )
}
