import GithubSlugger from 'github-slugger'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import templateDevMd from '../../../template-dev.md?raw'

type TocItem = { depth: 2 | 3; text: string; id: string }

function buildToc(md: string): TocItem[] {
  const slugger = new GithubSlugger()
  const items: TocItem[] = []
  for (const line of md.split(/\n/)) {
    const h2 = /^## (.+)$/.exec(line)
    const h3 = /^### (.+)$/.exec(line)
    if (h2) {
      const text = h2[1].trim()
      if (text === '目录') continue
      items.push({ depth: 2, text, id: slugger.slug(text) })
    } else if (h3) {
      const text = h3[1].trim()
      items.push({ depth: 3, text, id: slugger.slug(text) })
    }
  }
  return items
}

export default function DocsPage() {
  const toc = useMemo(() => buildToc(templateDevMd), [])
  const [activeId, setActiveId] = useState(() => toc[0]?.id ?? '')

  const scrollSync = useCallback(() => {
    const root = document.querySelector('.docs-markdown')
    if (!root || toc.length === 0) return
    const marker = window.scrollY + 130
    let current = toc[0]?.id ?? ''
    for (const { id } of toc) {
      const el = document.getElementById(id)
      if (!el) continue
      const top = el.getBoundingClientRect().top + window.scrollY
      if (top <= marker) current = id
    }
    setActiveId((prev) => (prev !== current ? current : prev))
  }, [toc])

  useEffect(() => {
    window.addEventListener('scroll', scrollSync, { passive: true })
    return () => window.removeEventListener('scroll', scrollSync)
  }, [scrollSync])

  useEffect(() => {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ''))
    if (!hash) return
    window.setTimeout(() => {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setActiveId(hash)
      }
    }, 0)
  }, [])

  function goToSection(id: string) {
    setActiveId(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', `#${encodeURIComponent(id)}`)
  }

  return (
    <>
      <section className="breadcrumb breadcrumb-compact">
        <div className="container">
          <div className="breadcrumb-content">
            <Link to="/">
              <i className="fas fa-home" /> 首页
            </Link>
            <i className="fas fa-chevron-right" />
            <span>开发文档</span>
          </div>
        </div>
      </section>

      <section className="list-page docs-help-page">
        <div className="container docs-help-inner">
          <aside className="component-card docs-sidebar" aria-label="文档目录">
            <div className="component-title docs-sidebar-head">
              <h2>
                <i className="fas fa-book" /> 文档目录
              </h2>
            </div>
            <nav className="docs-toc">
              <ul className="docs-toc-list">
                {toc.map((item) => (
                  <li
                    key={`${item.depth}-${item.id}`}
                    className={item.depth === 3 ? 'docs-toc-sub' : undefined}
                  >
                    <button
                      type="button"
                      className={`docs-toc-link${activeId === item.id ? ' active' : ''}`}
                      onClick={() => goToSection(item.id)}
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="component-card docs-main" aria-label="正文">
            <div className="docs-markdown markdown-body-storefront">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug]}
                components={{
                  a: ({ href, children, ...rest }) => {
                    if (href?.startsWith('#')) {
                      const id = decodeURIComponent(href.slice(1))
                      return (
                        <button type="button" className="docs-inline-anchor" onClick={() => goToSection(id)}>
                          {children}
                        </button>
                      )
                    }
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
                        {children}
                      </a>
                    )
                  },
                }}
              >
                {templateDevMd}
              </ReactMarkdown>
            </div>
          </article>
        </div>
      </section>
    </>
  )
}
