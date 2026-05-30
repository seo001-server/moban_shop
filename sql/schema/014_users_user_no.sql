-- 对外用户 UID：MU + 10 位随机（首位字母），共 12 位，不含注册日期

ALTER TABLE users
  ADD COLUMN user_no VARCHAR(16) NULL COMMENT '对外用户 UID：MU+10位随机' AFTER id;

UPDATE users
SET user_no = CONCAT(
  'MU',
  CHAR(65 + (id % 26)),
  UPPER(SUBSTRING(SHA2(CONCAT('moban_user_', id), 256), 2, 9))
)
WHERE user_no IS NULL;

ALTER TABLE users
  MODIFY COLUMN user_no VARCHAR(16) NOT NULL,
  ADD UNIQUE KEY users_user_no_uq (user_no);
