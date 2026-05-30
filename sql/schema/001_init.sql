-- init schema for catalog + auth MVP (utf8mb4)

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '商品/模板 ID',
  slug VARCHAR(255) NOT NULL COMMENT 'URL 唯一标识，前台详情路径为 /products/{id}',
  category VARCHAR(12) NOT NULL DEFAULT 'film' COMMENT '类目：film 影视 | book 阅读 | game 游戏 | shop 商城',
  title VARCHAR(500) NOT NULL COMMENT '商品标题',
  description TEXT NULL COMMENT '商品描述（Markdown 或纯文本）',
  price_minor BIGINT NOT NULL COMMENT '价格（最小货币单位，如分）',
  currency CHAR(3) NOT NULL COMMENT '币种（ISO 4217，如 USD/CNY）',
  image_url VARCHAR(1024) NULL COMMENT '封面图 URL',
  preview_url VARCHAR(255) NULL DEFAULT NULL COMMENT '在线演示地址',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序权重，数值越小越靠前（综合排序）',
  recommended TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否推荐到首页展示区：0 否 | 1 是',
  downloads INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '下载量（前台「人气」排序）',
  score DOUBLE NOT NULL DEFAULT 0 COMMENT '评分（前台「评分」排序，如 4.8）',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY products_slug_unique (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品表';
