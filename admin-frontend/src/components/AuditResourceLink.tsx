import { useNavigate } from 'react-router-dom'
import { canJumpAuditResource } from '../lib/auditLog'

type AuditResourceLinkProps = {
  resource: string
  resourceId: string
}

export function AuditResourceLink({ resource, resourceId }: AuditResourceLinkProps) {
  const nav = useNavigate()

  if (!resourceId) {
    return <>—</>
  }

  if (!canJumpAuditResource(resource, resourceId)) {
    return <>{resourceId}</>
  }

  function jump() {
    switch (resource) {
      case 'order':
        nav(`/orders/${resourceId}`)
        break
      case 'product':
        nav('/templates', { state: { editId: Number(resourceId) } })
        break
      case 'business_section':
        nav('/cms/sections')
        break
      case 'site_content':
        nav('/cms/homepage')
        break
      case 'doc':
        nav(`/cms/docs/${encodeURIComponent(resourceId)}`)
        break
    }
  }

  return (
    <button type="button" className="linkish" onClick={jump}>
      {resourceId}
    </button>
  )
}
