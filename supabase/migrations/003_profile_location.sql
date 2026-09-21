-- Profile location / country (reference documentation)
--
-- Adds a free-text location (country) field to user profiles so admins can
-- allocate a country to each person in the People page.
--
-- NOTE: As with 001/002, this Supabase project's SQL Editor lacks privileges
-- to alter tables in the public schema ("must be owner of table"). Add this
-- column via the Supabase Table Editor UI instead:
--
--   Table:    public.profiles
--   Column:   location
--   Type:     text
--   Default:  (none)
--   Nullable: yes
--
-- Intended DDL for an environment where you have owner rights:

alter table public.profiles
  add column if not exists location text;

-- No RLS changes required: profile reads/writes for admin go through the
-- service-role admin API.
