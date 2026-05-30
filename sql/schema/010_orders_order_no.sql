-- 对外订单号：MS + YYMMDD + 8 位随机（首位字母），共 16 位

ALTER TABLE orders
  ADD COLUMN order_no VARCHAR(20) NULL COMMENT '对外订单号：MS+YYMMDD+8位随机' AFTER id;

UPDATE orders
SET order_no = CONCAT(
  'MS',
  DATE_FORMAT(created_at, '%y%m%d'),
  CONCAT(
    CHAR(65 + (id % 26)),
    UPPER(SUBSTRING(SHA2(CONCAT('moban_order_', id), 256), 2, 7))
  )
)
WHERE order_no IS NULL;

ALTER TABLE orders
  MODIFY COLUMN order_no VARCHAR(20) NOT NULL,
  ADD UNIQUE KEY orders_order_no_uq (order_no);
