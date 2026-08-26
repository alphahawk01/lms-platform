-- Course Categories schema (reference documentation)
--
-- NOTE: On this Supabase project, the SQL Editor lacks privileges to create
-- tables or alter existing ones (errors: "must be owner of table" /
-- "permission denied for schema public"). These objects were therefore
-- created via the Supabase Table Editor UI. This file documents the intended
-- schema for reference and for setting up a fresh environment.
--
-- Categories are many-to-many with courses, via the course_category_links
-- join table. All category reads/writes in the app go through the service-role
-- admin API, which bypasses RLS.

-- Categories
create table if not exists public.course_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Join table: links a course to a category (many-to-many)
create table if not exists public.course_category_links (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  category_id uuid not null references public.course_categories(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Seed data
insert into public.course_categories (name)
values ('Aussie Rules'), ('Football')
on conflict (name) do nothing;

-- The older single-category column public.courses.category_id is now unused
-- (superseded by course_category_links) and can be dropped once confirmed safe.
