-- moban_shop 完整数据库结构（仅 DDL，无演示数据）
-- 用法：mysql -u user -p moban_shop < sql/schema.sql
-- 注意：会 DROP 已有表，仅适用于全新库或开发环境重建。

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS admin_audit_logs;
DROP TABLE IF EXISTS `business`;
DROP TABLE IF EXISTS business_sections;
DROP TABLE IF EXISTS site_content;
DROP TABLE IF EXISTS docs;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS `admin`;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- 前台用户
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_no VARCHAR(16) NOT NULL COMMENT '对外用户 UID：MU+10位随机（首位字母）',
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY users_email_unique (email),
  UNIQUE KEY users_user_no_uq (user_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='前台用户';

-- ---------------------------------------------------------------------------
-- 后台管理员（与 users 独立）
-- ---------------------------------------------------------------------------

CREATE TABLE `admin` (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account VARCHAR(255) NOT NULL,
  nickname VARCHAR(255) NOT NULL DEFAULT '' COMMENT '展示昵称',
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY admin_account_unique (account)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='后台管理员';

-- ---------------------------------------------------------------------------
-- 模板商品
-- ---------------------------------------------------------------------------

CREATE TABLE products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '商品/模板 ID',
  slug VARCHAR(255) NOT NULL COMMENT 'URL 唯一标识',
  category VARCHAR(12) NOT NULL DEFAULT 'film' COMMENT '类目：film|book|game|shop',
  title VARCHAR(500) NOT NULL COMMENT '商品标题',
  description TEXT NULL COMMENT '商品描述',
  price_minor BIGINT NOT NULL COMMENT '价格（最小货币单位）',
  currency CHAR(3) NOT NULL COMMENT '币种 ISO 4217',
  image_url VARCHAR(1024) NULL COMMENT '封面图 URL',
  preview_url VARCHAR(1024) NULL DEFAULT NULL COMMENT '在线演示地址',
  download_url VARCHAR(1024) NULL DEFAULT NULL COMMENT '已购用户下载地址（/uploads 或外链）',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序权重，越小越靠前',
  recommended TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否推荐到首页：0 否 | 1 是',
  visible TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在前台展示：0 否 | 1 是',
  downloads INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '展示用下载量',
  score DOUBLE NOT NULL DEFAULT 0 COMMENT '展示用评分',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY products_slug_unique (slug),
  KEY products_category_idx (category),
  KEY products_visible_idx (visible),
  KEY products_sort_order_idx (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板商品';

-- ---------------------------------------------------------------------------
-- 订单
-- ---------------------------------------------------------------------------

CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '订单 ID',
  order_no VARCHAR(20) NOT NULL COMMENT '对外订单号：MS+YYMMDD+8位随机（首位字母）',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '下单用户 ID',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'pending|paid|cancelled|refunded',
  total_amount_minor BIGINT NOT NULL DEFAULT 0 COMMENT '订单总金额（最小货币单位）',
  currency CHAR(3) NOT NULL COMMENT '币种 ISO 4217',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '下单时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  UNIQUE KEY orders_order_no_uq (order_no),
  KEY orders_user_id_idx (user_id),
  KEY orders_status_idx (status),
  KEY orders_created_at_idx (created_at),
  CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单主表';

CREATE TABLE order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '明细 ID',
  order_id BIGINT UNSIGNED NOT NULL COMMENT '所属订单 ID',
  product_id BIGINT UNSIGNED NOT NULL COMMENT '商品 ID',
  quantity INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '购买数量',
  unit_price_minor BIGINT NOT NULL COMMENT '成交单价快照（最小货币单位）',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '明细创建时间',
  KEY order_items_order_id_idx (order_id),
  KEY order_items_product_id_idx (product_id),
  CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT order_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细';

-- ---------------------------------------------------------------------------
-- 购物车
-- ---------------------------------------------------------------------------

CREATE TABLE cart_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '购物车行 ID',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '用户 ID',
  product_id BIGINT UNSIGNED NOT NULL COMMENT '商品 ID',
  quantity INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '数量',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  UNIQUE KEY cart_items_user_product_uq (user_id, product_id),
  KEY cart_items_user_id_idx (user_id),
  CONSTRAINT cart_items_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT cart_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户购物车';

-- ---------------------------------------------------------------------------
-- 密码重置
-- ---------------------------------------------------------------------------

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL COMMENT 'SHA-256 hex of raw token',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY password_reset_tokens_user_id (user_id),
  KEY password_reset_tokens_expires (expires_at),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='密码重置令牌';

-- ---------------------------------------------------------------------------
-- 业务板块（前台「业务」页）
-- ---------------------------------------------------------------------------

CREATE TABLE business_sections (
  slug VARCHAR(32) NOT NULL PRIMARY KEY COMMENT 'program|luodi|cdn|resources|monetize',
  label VARCHAR(64) NOT NULL COMMENT '展示名称',
  icon VARCHAR(64) NOT NULL DEFAULT 'fa-circle' COMMENT 'Font Awesome class',
  tagline VARCHAR(255) NOT NULL DEFAULT '' COMMENT '副标题',
  description TEXT NOT NULL COMMENT '板块简介',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在前台展示',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业务板块元数据';

CREATE TABLE `business` (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '条目 ID',
  section_slug VARCHAR(32) NOT NULL COMMENT '所属板块 slug',
  title VARCHAR(500) NOT NULL COMMENT '标题',
  description TEXT NOT NULL COMMENT '描述',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY business_section_slug_idx (section_slug),
  KEY business_sort_order_idx (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业务板块条目';

-- ---------------------------------------------------------------------------
-- CMS：首页配置与文档
-- ---------------------------------------------------------------------------

CREATE TABLE site_content (
  content_key VARCHAR(64) NOT NULL PRIMARY KEY COMMENT '如 homepage',
  content_json JSON NOT NULL COMMENT 'JSON 配置',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站点可配置内容';

CREATE TABLE docs (
  slug VARCHAR(64) NOT NULL PRIMARY KEY COMMENT '文档 slug',
  title VARCHAR(255) NOT NULL COMMENT '文档标题',
  markdown MEDIUMTEXT NOT NULL COMMENT 'Markdown 正文',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='前台文档';

-- ---------------------------------------------------------------------------
-- 后台审计日志
-- ---------------------------------------------------------------------------

CREATE TABLE admin_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(64) NOT NULL,
  resource VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL DEFAULT '',
  detail VARCHAR(512) NOT NULL DEFAULT '',
  ip VARCHAR(45) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_audit_created (created_at DESC),
  INDEX idx_admin_audit_admin (admin_id),
  INDEX idx_admin_audit_action (action),
  CONSTRAINT fk_admin_audit_admin FOREIGN KEY (admin_id) REFERENCES `admin` (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='后台操作审计';
