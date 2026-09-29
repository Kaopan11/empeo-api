-- Run in the SQL Editor. Adds published_at and stores cycle status as text
-- so IN_PROGRESS | PUBLISHED both work on existing DBs (enum or text).

ALTER TABLE public.review_cycles
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.review_cycles
    ALTER COLUMN status DROP DEFAULT;

  ALTER TABLE public.review_cycles
    ALTER COLUMN status TYPE text
    USING status::text;

  DROP TYPE IF EXISTS public.review_cycle_status;
  DROP TYPE IF EXISTS public.cycle_status;

  ALTER TABLE public.review_cycles
    ALTER COLUMN status SET DEFAULT 'IN_PROGRESS';
END $$;
