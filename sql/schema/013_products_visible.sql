-- 模板是否在前台展示：0 隐藏 | 1 展示

ALTER TABLE products
  ADD COLUMN visible TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在前台展示：0 否 | 1 是' AFTER recommended;
