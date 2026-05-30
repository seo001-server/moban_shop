-- 去掉订单号中的连字符（MS26-05-29… → MS260529…）

UPDATE orders
SET order_no = REPLACE(order_no, '-', '')
WHERE order_no LIKE '%-%';
