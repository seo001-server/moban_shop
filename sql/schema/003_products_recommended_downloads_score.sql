-- 现网库升级：为 products 增加推荐、下载量、评分
ALTER TABLE products
  ADD COLUMN recommended TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否推荐' AFTER sort_order,
  ADD COLUMN downloads INT UNSIGNED NOT NULL DEFAULT 0 AFTER recommended,
  ADD COLUMN score DOUBLE NOT NULL DEFAULT 0 AFTER downloads;
