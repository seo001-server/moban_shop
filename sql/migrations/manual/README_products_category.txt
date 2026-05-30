Manual migration: add `products.category`

If your database was created from an older `001_init.sql` **without** the `category` column, apply:

ALTER TABLE products
  ADD COLUMN category VARCHAR(16) NOT NULL DEFAULT 'film' AFTER slug;

Valid values used by the storefront filter: film, book, game, shop

After altering, optionally normalize rows:

UPDATE products SET category = 'film' WHERE category = '' OR category IS NULL;
