-- Optional seed data for local development (run after schema).
INSERT INTO products (slug, category, title, description, price_minor, currency, image_url, sort_order, recommended, downloads, score)
VALUES
  ('demo-starter', 'film', 'Demo starter template', 'Example row for API smoke tests.', 990, 'USD', NULL, 10, 1, 5200, 4.7),
  ('demo-pro', 'book', 'Demo pro template', 'Second example product.', 2990, 'USD', NULL, 20, 0, 1800, 4.2);
