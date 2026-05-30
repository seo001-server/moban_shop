-- 用户购物车：一行一商品，数量可累加

CREATE TABLE cart_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '购物车行 ID',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '用户 ID，关联 users.id',
  product_id BIGINT UNSIGNED NOT NULL COMMENT '商品 ID，关联 products.id',
  quantity INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '数量',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  UNIQUE KEY cart_items_user_product_uq (user_id, product_id),
  KEY cart_items_user_id_idx (user_id),
  CONSTRAINT cart_items_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT cart_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户购物车';
