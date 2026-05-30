-- 从旧版单商品 orders（含 product_id）升级为多商品结构
-- 仅在你已执行过旧版 005_orders.sql 时运行

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '明细 ID',
  order_id BIGINT UNSIGNED NOT NULL COMMENT '所属订单 ID，关联 orders.id',
  product_id BIGINT UNSIGNED NOT NULL COMMENT '商品/模板 ID，关联 products.id',
  quantity INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '购买数量',
  unit_price_minor BIGINT NOT NULL COMMENT '成交单价（最小货币单位），下单时快照',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '明细创建时间',
  KEY order_items_order_id_idx (order_id),
  KEY order_items_product_id_idx (product_id),
  CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT order_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细表（一行一个商品）';

-- 将旧订单的单商品数据迁入 order_items
INSERT INTO order_items (order_id, product_id, quantity, unit_price_minor)
SELECT o.id, o.product_id, 1, o.amount_minor
FROM orders o
WHERE EXISTS (
  SELECT 1 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'product_id'
)
AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id);

ALTER TABLE orders
  CHANGE COLUMN amount_minor total_amount_minor BIGINT NOT NULL DEFAULT 0 COMMENT '订单总金额（最小货币单位），为明细行合计';

ALTER TABLE orders DROP FOREIGN KEY orders_product_fk;
ALTER TABLE orders DROP INDEX orders_product_id_idx;
ALTER TABLE orders DROP COLUMN product_id;
