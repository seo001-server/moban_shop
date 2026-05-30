-- 业务板块展示条目（程序/落地/CDN/资源/变现等分类下的产品卡片）

CREATE TABLE `business` (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '条目 ID',
  section_slug VARCHAR(32) NOT NULL COMMENT '所属业务板块：program|luodi|cdn|resources|monetize',
  title VARCHAR(500) NOT NULL COMMENT '标题',
  description TEXT NOT NULL COMMENT '描述',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序权重，数值越小越靠前',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY business_section_slug_idx (section_slug),
  KEY business_sort_order_idx (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业务板块产品表';
