-- Demo admin login (plaintext password: AdminInit#ChangeMe). Replace/delete after first login.
-- Accounts are independent of storefront `users`.
INSERT INTO `admin` (account, nickname, password_hash)
VALUES (
  'admin',
  'admin',
  '$2a$10$yaMsR0UDT.pMqFMCouQZJePlBCTkUXQVyTleVSYKv63GJriz0EVaO'
);
