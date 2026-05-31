import { Link } from 'react-router-dom'
import { PageMeta, PAGE_DESCRIPTIONS } from '../components/PageMeta'
import '../styles/not-found.css'

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <PageMeta title="页面未找到" description={PAGE_DESCRIPTIONS.notFound} noIndex />
      <div className="container not-found-inner">
        <p className="not-found-code" aria-hidden>
          404
        </p>
        <h1>页面不存在</h1>
        <p className="muted not-found-desc">您访问的链接可能已失效，或地址输入有误。</p>
        <div className="not-found-actions">
          <Link className="btn btn-primary" to="/">
            返回首页
          </Link>
          <Link className="btn btn-secondary" to="/products">
            浏览模板
          </Link>
        </div>
      </div>
    </div>
  )
}
