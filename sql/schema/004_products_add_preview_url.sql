-- 现网库升级：为 products 增加演示地址字段
ALTER TABLE products
  ADD COLUMN preview_url VARCHAR(255) DEFAULT NULL COMMENT '演示地址' AFTER image_url;
