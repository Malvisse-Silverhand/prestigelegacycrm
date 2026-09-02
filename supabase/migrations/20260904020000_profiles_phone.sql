-- Phone number on profiles, so an admin can share a new user's login
-- details straight to WhatsApp instead of only copying text to paste.
alter table profiles add column if not exists phone text;
