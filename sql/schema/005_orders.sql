-- 商城订单：一笔订单可包含多个商品（明细见 order_items）

CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '订单 ID',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '下单用户 ID，关联 users.id',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '订单状态：pending 待支付 | paid 已支付 | cancelled 已取消 | refunded 已退款',
  total_amount_minor BIGINT NOT NULL DEFAULT 0 COMMENT '订单总金额（最小货币单位，如分），为明细行合计',
  currency CHAR(3) NOT NULL COMMENT '币种（ISO 4217，如 USD/CNY）',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '下单时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  KEY orders_user_id_idx (user_id),
  KEY orders_status_idx (status),
  KEY orders_created_at_idx (created_at),
  CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单主表';

CREATE TABLE order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '明细 ID',
  order_id BIGINT UNSIGNED NOT NULL COMMENT '所属订单 ID，关联 orders.id',
  product_id BIGINT UNSIGNED NOT NULL COMMENT '商品/模板 ID，关联 products.id',
  quantity INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '购买数量',
  unit_price_minor BIGINT NOT NULL COMMENT '成交单价（最小货币单位），下单时快照，不随商品改价变化',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '明细创建时间',
  KEY order_items_order_id_idx (order_id),
  KEY order_items_product_id_idx (product_id),
  CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT order_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细表（一行一个商品）';
