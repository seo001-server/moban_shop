import { Link, useNavigate } from 'react-router-dom'
import { ProductFormPanel } from '../components/ProductFormPanel'

export default function ProductFormPage() {
  const nav = useNavigate()

  return (
    <div className="page">
      <div>
        <Link to="/templates" className="page-back">
          ← 返回列表
        </Link>
        <div className="page-header">
          <div className="page-header__text">
            <h1>新建模板</h1>
            <p className="page-header__desc">填写模板信息并发布到商城</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__body">
          <ProductFormPanel
            productId="new"
            onCancel={() => nav('/templates')}
            onSaved={() => nav('/templates')}
          />
        </div>
      </div>
    </div>
  )
}
