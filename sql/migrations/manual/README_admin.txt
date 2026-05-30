Manual migrations for existing databases

Fresh install: apply `sql/schema/*.sql` in order including `002_admin.sql`, then optionally `sql/seed/admin_demo.sql`.

If you already had `staff_users` (email-based):

1) RENAME TABLE staff_users TO `admin`;
2) ALTER TABLE `admin` CHANGE COLUMN email account VARCHAR(255) NOT NULL;
3) DROP INDEX staff_users_email_unique ON `admin`;
4) ALTER TABLE `admin` ADD UNIQUE KEY admin_account_unique (account);

If upgrading from a schema without `nickname`:

5) Apply `sql/migrations/manual/008_admin_nickname.sql` (adds nickname, backfills from account).
