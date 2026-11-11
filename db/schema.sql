-- CareerTrack database schema (PostgreSQL / Neon).
--
-- Run this ONCE in the Neon SQL Editor, then run db/seed.sql.
-- It is safe to run again: nothing is changed if it already exists.

-- Hands out the numbers behind APP-### ids. A sequence only ever goes up, so
-- an id is never reused, even after a delete or a server restart. The seed
-- data uses 1-5, so the sequence starts at 6.
CREATE SEQUENCE IF NOT EXISTS application_number_seq START WITH 6;

CREATE TABLE IF NOT EXISTS applications (
  id           text PRIMARY KEY,
  company      text NOT NULL CHECK (btrim(company) <> ''),
  role         text NOT NULL CHECK (btrim(role) <> ''),
  stage        text NOT NULL
               CHECK (stage IN ('applied', 'interview', 'offer', 'rejected')),
  applied_date date NOT NULL,
  CONSTRAINT applications_id_format CHECK (id ~ '^APP-[0-9]{3,}$')
);

-- To reset a DEVELOPMENT database (never production), run:
--   TRUNCATE applications;
--   ALTER SEQUENCE application_number_seq RESTART WITH 6;
-- and then run db/seed.sql again.
