Apply on fresh databases:

  mysql ... < sql/schema/005_orders.sql

If you already applied the old single-product 005 (orders.product_id), run instead:

  mysql ... < sql/migrations/manual/006_orders_multi_item.sql

Demo multi-item order (adjust user/product ids):

  INSERT INTO orders (user_id, status, total_amount_minor, currency) VALUES (1, 'paid', 3980, 'USD');
  INSERT INTO order_items (order_id, product_id, quantity, unit_price_minor) VALUES
    (LAST_INSERT_ID(), 1, 1, 990),
    (LAST_INSERT_ID(), 2, 1, 2990);
