-- 现网库：为 products 表补全/更新字段中文注释（表已存在时执行）
-- 新库请直接使用 sql/schema/001_init.sql

ALTER TABLE products COMMENT = '产品表';

ALTER TABLE products
  MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '商品/模板 ID',
  MODIFY COLUMN slug VARCHAR(255) NOT NULL COMMENT 'URL 唯一标识，前台详情路径为 /products/{id}',
  MODIFY COLUMN category VARCHAR(12) NOT NULL DEFAULT 'film' COMMENT '类目：film 影视 | book 阅读 | game 游戏 | shop 商城',
  MODIFY COLUMN title VARCHAR(500) NOT NULL COMMENT '商品标题',
  MODIFY COLUMN description TEXT NULL COMMENT '商品描述（Markdown 或纯文本）',
  MODIFY COLUMN price_minor BIGINT NOT NULL COMMENT '价格（最小货币单位，如分）',
  MODIFY COLUMN currency CHAR(3) NOT NULL COMMENT '币种（ISO 4217，如 USD/CNY）',
  MODIFY COLUMN image_url VARCHAR(1024) NULL COMMENT '封面图 URL',
  MODIFY COLUMN preview_url VARCHAR(255) NULL DEFAULT NULL COMMENT '在线演示地址',
  MODIFY COLUMN sort_order INT NOT NULL DEFAULT 0 COMMENT '排序权重，数值越小越靠前（综合排序）',
  MODIFY COLUMN recommended TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否推荐到首页展示区：0 否 | 1 是',
  MODIFY COLUMN downloads INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '下载量（前台「人气」排序）',
  MODIFY COLUMN score DOUBLE NOT NULL DEFAULT 0 COMMENT '评分（前台「评分」排序，如 4.8）',
  MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';
