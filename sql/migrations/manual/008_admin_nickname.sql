-- Add display nickname for back-office accounts (defaults to account for existing rows).
ALTER TABLE `admin`
  ADD COLUMN nickname VARCHAR(255) NOT NULL DEFAULT '' AFTER account;

UPDATE `admin` SET nickname = account WHERE nickname = '';
