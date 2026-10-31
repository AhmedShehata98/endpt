-- Local-only credential hash for offline sign-in (never sync).
ALTER TABLE user_accounts ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
