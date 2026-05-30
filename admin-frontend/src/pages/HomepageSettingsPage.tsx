import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../api/http'
import { adminApiFetch } from '../api/adminHttp'
import type { HomepageCategoryCard, HomepageContent, HomepageFeature, HomepageHero } from '../api/types'
import { IconPickerInput } from '../components/IconPickerField'
import { useConfirm } from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

type HomepageTab = 'hero' | 'categories' | 'features'

const TABS: { key: HomepageTab; label: string; saveLabel: string; patchKey: 'hero' | 'category_cards' | 'features' }[] = [
  { key: 'hero', label: 'Hero 区域', saveLabel: '保存 Hero', patchKey: 'hero' },
  { key: 'categories', label: '热门模板分类', saveLabel: '保存分类卡片', patchKey: 'category_cards' },
  { key: 'features', label: '我们的优势', saveLabel: '保存优势区块', patchKey: 'features' },
]

function emptyHero(): HomepageHero {
  return {
    title: '',
    subtitle: '',
    primary_button: { label: '', to: '' },
    secondary_button: { label: '', to: '' },
  }
}

function cloneContent(content: HomepageContent): HomepageContent {
  return JSON.parse(JSON.stringify(content)) as HomepageContent
}

function CardEditor({
  items,
  onChange,
}: {
  items: HomepageCategoryCard[]
  onChange: (next: HomepageCategoryCard[]) => void
}) {
  const { confirm, dialog: confirmDialog } = useConfirm()

  function update(i: number, patch: Partial<HomepageCategoryCard>) {
    onChange(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  }

  async function remove(i: number) {
    const name = items[i].title.trim() || `卡片 ${i + 1}`
    const ok = await confirm({
      title: '删除确认',
      message: `确认删除「${name}」？`,
      confirmLabel: '删除',
      danger: true,
    })
    if (!ok) return
    onChange(items.filter((_, idx) => idx !== i))
  }

  return (
    <>
      <div className="cms-repeat-editor">
        <div className="cms-repeat-list__toolbar">
          <button
            type="button"
            className="btn small"
            onClick={() => onChange([...items, { icon: 'fa-star', title: '', description: '', to: '' }])}
          >
            添加分类卡片
          </button>
        </div>
        <div className="cms-repeat-list cms-repeat-list--grid">
          {items.map((item, i) => (
            <div key={i} className="cms-repeat-item stack form">
              <div className="cms-repeat-item__head">
                <span className="cms-repeat-item__index">卡片 {i + 1}</span>
                <button type="button" className="btn small danger" onClick={() => void remove(i)}>
                  删除
                </button>
              </div>
              <div className="cms-card-icon-title-row">
                <IconPickerInput compact value={item.icon} onChange={(icon) => update(i, { icon })} />
                <label>
                  标题
                  <input type="text" value={item.title} onChange={(e) => update(i, { title: e.target.value })} />
                </label>
              </div>
              <label>
                描述
                <input type="text" value={item.description} onChange={(e) => update(i, { description: e.target.value })} />
              </label>
              <label>
                链接
                <input type="text" value={item.to} onChange={(e) => update(i, { to: e.target.value })} />
              </label>
            </div>
          ))}
        </div>
      </div>
      {confirmDialog}
    </>
  )
}

function FeatureEditor({
  items,
  onChange,
}: {
  items: HomepageFeature[]
  onChange: (next: HomepageFeature[]) => void
}) {
  const { confirm, dialog: confirmDialog } = useConfirm()

  function update(i: number, patch: Partial<HomepageFeature>) {
    onChange(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  }

  async function remove(i: number) {
    const name = items[i].title.trim() || `优势 ${i + 1}`
    const ok = await confirm({
      title: '删除确认',
      message: `确认删除「${name}」？`,
      confirmLabel: '删除',
      danger: true,
    })
    if (!ok) return
    onChange(items.filter((_, idx) => idx !== i))
  }

  return (
    <>
      <div className="cms-repeat-editor">
        <div className="cms-repeat-list__toolbar">
          <button
            type="button"
            className="btn small"
            onClick={() => onChange([...items, { icon: 'fa-star', title: '', text: '' }])}
          >
            添加优势项
          </button>
        </div>
        <div className="cms-repeat-list cms-repeat-list--grid">
          {items.map((item, i) => (
            <div key={i} className="cms-repeat-item stack form">
              <div className="cms-repeat-item__head">
                <span className="cms-repeat-item__index">优势 {i + 1}</span>
                <button type="button" className="btn small danger" onClick={() => void remove(i)}>
                  删除
                </button>
              </div>
              <div className="cms-card-icon-title-row">
                <IconPickerInput compact value={item.icon} onChange={(icon) => update(i, { icon })} />
                <label>
                  标题
                  <input type="text" value={item.title} onChange={(e) => update(i, { title: e.target.value })} />
                </label>
              </div>
              <label>
                说明
                <textarea rows={2} value={item.text} onChange={(e) => update(i, { text: e.target.value })} />
              </label>
            </div>
          ))}
        </div>
      </div>
      {confirmDialog}
    </>
  )
}

function HeroEditor({ hero, onChange }: { hero: HomepageHero; onChange: (next: HomepageHero) => void }) {
  return (
    <div className="stack form">
      <label>
        主标题
        <input type="text" value={hero.title} onChange={(e) => onChange({ ...hero, title: e.target.value })} />
        <span className="muted small">支持简单 HTML，例如：专业级&lt;span&gt;站群系统&lt;/span&gt;一站式解决方案</span>
      </label>
      <label>
        副标题
        <textarea rows={3} value={hero.subtitle} onChange={(e) => onChange({ ...hero, subtitle: e.target.value })} />
      </label>
      <div className="form-grid form-grid--2">
        <label>
          主按钮文案
          <input
            type="text"
            value={hero.primary_button.label}
            onChange={(e) => onChange({ ...hero, primary_button: { ...hero.primary_button, label: e.target.value } })}
          />
        </label>
        <label>
          主按钮链接
          <input
            type="text"
            value={hero.primary_button.to}
            onChange={(e) => onChange({ ...hero, primary_button: { ...hero.primary_button, to: e.target.value } })}
          />
        </label>
      </div>
      <div className="form-grid form-grid--2">
        <label>
          次按钮文案
          <input
            type="text"
            value={hero.secondary_button.label}
            onChange={(e) =>
              onChange({ ...hero, secondary_button: { ...hero.secondary_button, label: e.target.value } })
            }
          />
        </label>
        <label>
          次按钮链接
          <input
            type="text"
            value={hero.secondary_button.to}
            onChange={(e) => onChange({ ...hero, secondary_button: { ...hero.secondary_button, to: e.target.value } })}
          />
        </label>
      </div>
    </div>
  )
}

export default function HomepageSettingsPage() {
  const { showToast } = useToast()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const [activeTab, setActiveTab] = useState<HomepageTab>('hero')
  const [hero, setHero] = useState<HomepageHero>(emptyHero)
  const [categoryCards, setCategoryCards] = useState<HomepageCategoryCard[]>([])
  const [features, setFeatures] = useState<HomepageFeature[]>([])
  const [saved, setSaved] = useState<HomepageContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [savingTab, setSavingTab] = useState<HomepageTab | null>(null)

  const isHeroDirty = useMemo(
    () => saved !== null && JSON.stringify(hero) !== JSON.stringify(saved.hero),
    [hero, saved],
  )
  const isCategoriesDirty = useMemo(
    () => saved !== null && JSON.stringify(categoryCards) !== JSON.stringify(saved.category_cards),
    [categoryCards, saved],
  )
  const isFeaturesDirty = useMemo(
    () => saved !== null && JSON.stringify(features) !== JSON.stringify(saved.features),
    [features, saved],
  )

  const tabDirtyMap: Record<HomepageTab, boolean> = {
    hero: isHeroDirty,
    categories: isCategoriesDirty,
    features: isFeaturesDirty,
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await adminApiFetch<HomepageContent>('/api/admin/site-content/homepage')
        if (!alive) return
        const content: HomepageContent = {
          hero: data.hero ?? emptyHero(),
          category_cards: data.category_cards ?? [],
          features: data.features ?? [],
        }
        setHero(content.hero)
        setCategoryCards(content.category_cards)
        setFeatures(content.features)
        setSaved(cloneContent(content))
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError) {
          setErr(e.message)
        } else {
          setErr('加载失败')
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const switchTab = useCallback(
    async (next: HomepageTab) => {
      if (next === activeTab) return
      if (tabDirtyMap[activeTab]) {
        const ok = await confirm({
          title: '未保存的修改',
          message: '当前分区有未保存的修改。切换分区不会丢失编辑内容，但请先保存以免遗忘。是否继续切换？',
          confirmLabel: '继续切换',
        })
        if (!ok) return
      }
      setActiveTab(next)
      setErr(null)
    },
    [activeTab, confirm, tabDirtyMap],
  )

  async function saveTab(tab: HomepageTab, ev?: FormEvent) {
    ev?.preventDefault()
    setSavingTab(tab)
    setErr(null)
    const tabMeta = TABS.find((t) => t.key === tab)!
    const patch: Partial<HomepageContent> =
      tab === 'hero'
        ? { hero }
        : tab === 'categories'
          ? { category_cards: categoryCards }
          : { features }
    try {
      const data = await adminApiFetch<HomepageContent>('/api/admin/site-content/homepage', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      const content: HomepageContent = {
        hero: data.hero ?? emptyHero(),
        category_cards: data.category_cards ?? [],
        features: data.features ?? [],
      }
      setHero(content.hero)
      setCategoryCards(content.category_cards)
      setFeatures(content.features)
      setSaved(cloneContent(content))
      showToast(`${tabMeta.label}已保存`, 'success')
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message)
      } else {
        setErr('保存失败')
      }
    } finally {
      setSavingTab(null)
    }
  }

  if (loading) {
    return <div className="loading-state">加载中…</div>
  }

  const activeMeta = TABS.find((t) => t.key === activeTab)!

  return (
    <div className="page">
      {confirmDialog}
      <div className="page-header">
        <div className="page-header__text">
          <h1>首页配置</h1>
          <p className="page-header__desc">各 Tab 仅保存当前分区，不会影响其他区块</p>
        </div>
      </div>

      <div className="card cms-homepage-settings">
        <div className="cms-settings-tabs" role="tablist" aria-label="首页配置分区">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`cms-settings-tab${activeTab === tab.key ? ' is-active' : ''}${tabDirtyMap[tab.key] ? ' is-dirty' : ''}`}
              onClick={() => void switchTab(tab.key)}
            >
              {tab.label}
              {tabDirtyMap[tab.key] ? <span className="cms-settings-tab__dot" aria-label="未保存" /> : null}
            </button>
          ))}
        </div>

        <div className="card__body cms-homepage-settings__panel">
          {activeTab === 'hero' ? (
            <form className="cms-homepage-tab-form" onSubmit={(ev) => void saveTab('hero', ev)}>
              <HeroEditor hero={hero} onChange={setHero} />
              {err ? (
                <div className="alert alert--error" role="alert">
                  {err}
                </div>
              ) : null}
              <div className="cms-tab-actions">
                {isHeroDirty ? <span className="cms-tab-actions__hint">有未保存修改</span> : null}
                <button type="submit" className="btn primary" disabled={savingTab === 'hero' || !isHeroDirty}>
                  {savingTab === 'hero' ? '保存中…' : activeMeta.saveLabel}
                </button>
              </div>
            </form>
          ) : null}

          {activeTab === 'categories' ? (
            <form className="cms-homepage-tab-form" onSubmit={(ev) => void saveTab('categories', ev)}>
              <CardEditor items={categoryCards} onChange={setCategoryCards} />
              {err ? (
                <div className="alert alert--error" role="alert">
                  {err}
                </div>
              ) : null}
              <div className="cms-tab-actions">
                {isCategoriesDirty ? <span className="cms-tab-actions__hint">有未保存修改</span> : null}
                <button
                  type="submit"
                  className="btn primary"
                  disabled={savingTab === 'categories' || !isCategoriesDirty}
                >
                  {savingTab === 'categories' ? '保存中…' : activeMeta.saveLabel}
                </button>
              </div>
            </form>
          ) : null}

          {activeTab === 'features' ? (
            <form className="cms-homepage-tab-form" onSubmit={(ev) => void saveTab('features', ev)}>
              <FeatureEditor items={features} onChange={setFeatures} />
              {err ? (
                <div className="alert alert--error" role="alert">
                  {err}
                </div>
              ) : null}
              <div className="cms-tab-actions">
                {isFeaturesDirty ? <span className="cms-tab-actions__hint">有未保存修改</span> : null}
                <button type="submit" className="btn primary" disabled={savingTab === 'features' || !isFeaturesDirty}>
                  {savingTab === 'features' ? '保存中…' : activeMeta.saveLabel}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
