-- Seed business section metadata (from frontend businessSections.ts)
INSERT INTO business_sections (slug, label, icon, tagline, description, sort_order, enabled) VALUES
('program', '程序', 'fa-code', '站群管理程序',
 '面向多站点运营，提供站群统一管理程序，支持批量建站、内容分发与模板切换，快速搭建规模化内容站点矩阵。', 1, 1),
('luodi', '落地', 'fa-lock', '各种加密软件',
 '提供多种落地页加密与防护方案，降低站点在分发与访问链路中被识别、被拦截的风险。', 2, 1),
('cdn', 'cdn', 'fa-cloud', 'CDN 搭建',
 '面向内容分发与加速需求，提供 CDN 节点规划、回源配置、缓存策略与 HTTPS 接入支持。', 3, 1),
('resources', '资源', 'fa-database', '采集资源',
 '围绕内容站点运营，提供资源采集、整理、入库与更新流程支持，快速搭建可维护的内容资源池。', 4, 1),
('monetize', '变现', 'fa-chart-line', '回收流量',
 '针对已有流量与访问场景，提供流量回收、转化路径设计与变现策略，让访问价值高效沉淀。', 5, 1)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  icon = VALUES(icon),
  tagline = VALUES(tagline),
  description = VALUES(description),
  sort_order = VALUES(sort_order);
