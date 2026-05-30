-- Seed homepage content (from HomePage.tsx constants)
INSERT INTO site_content (content_key, content_json) VALUES (
  'homepage',
  JSON_OBJECT(
    'hero', JSON_OBJECT(
      'title', '专业级站群系统与模板商城',
      'subtitle', '面向影视、小说、游戏与导购场景，提供可快速部署的站群程序、加密落地、CDN 与模板选购一站式服务。',
      'primary_button', JSON_OBJECT('label', '浏览模板', 'to', '/products'),
      'secondary_button', JSON_OBJECT('label', '查看文档', 'to', '/docs')
    ),
    'category_cards', JSON_ARRAY(
      JSON_OBJECT('icon', 'fa-film', 'title', '影视娱乐', 'description', '点播、剧集、CMS 前台展示一站式主题', 'to', '/products?cat=film'),
      JSON_OBJECT('icon', 'fa-book', 'title', '小说阅读', 'description', '书库、书架与章节阅读体验优化模板', 'to', '/products?cat=book'),
      JSON_OBJECT('icon', 'fa-gamepad', 'title', '游戏社区', 'description', '资讯、攻略与下载资源整合布局', 'to', '/products?cat=game'),
      JSON_OBJECT('icon', 'fa-shopping-cart', 'title', '商城导购', 'description', '模板选购、 SKU 呈现与购物车流程', 'to', '/products?cat=shop')
    ),
    'features', JSON_ARRAY(
      JSON_OBJECT('icon', 'fa-sync-alt', 'title', '持续更新', 'text', '所有模板保持定期迭代，可免费获取更新要点，让您的站点紧跟技术演进。'),
      JSON_OBJECT('icon', 'fa-headset', 'title', '专业支持', 'text', '提供工作日在线答疑，协助您完成部署、主题配置与常见问题排查。'),
      JSON_OBJECT('icon', 'fa-mobile-alt', 'title', '响应式设计', 'text', '模板面向多端适配，手机与桌面均可获得连贯的浏览体验。'),
      JSON_OBJECT('icon', 'fa-shield-alt', 'title', '安全可靠', 'text', '代码结构与依赖保持透明，可降低未知脚本带来的运维风险。'),
      JSON_OBJECT('icon', 'fa-rocket', 'title', '优化性能', 'text', '重视首屏加载与资源编排，更易与 CDN、缓存策略结合。'),
      JSON_OBJECT('icon', 'fa-palette', 'title', '高度定制', 'text', '提供可替换的版面与色系思路，按需二次开发即可完成品牌化。')
    )
  )
)
ON DUPLICATE KEY UPDATE content_json = VALUES(content_json);
