-- Quiz option images (reference documentation)
--
-- Adds support for image-based answer options in quizzes. Each quiz_option
-- can now optionally carry an image in addition to (or instead of) text.
--
-- NOTE: As with 001, this Supabase project's SQL Editor lacks privileges to
-- alter tables in the public schema ("must be owner of table"). Add this
-- column via the Supabase Table Editor UI instead:
--
--   Table:   public.quiz_options
--   Column:  image_url
--   Type:    text
--   Default: (none)
--   Nullable: yes
--
-- The intended DDL (for a fresh environment where you have owner rights):

alter table public.quiz_options
  add column if not exists image_url text;

-- No RLS changes required: all quiz reads/writes go through the service-role
-- admin API, and learners read quiz_options via existing policies.
