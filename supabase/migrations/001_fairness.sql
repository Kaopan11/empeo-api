-- Fairness: normalized team z-scores, performance tiers, manager bias index per cycle.
-- Run on Supabase before using submit recalc.

alter table evaluations
  add column if not exists normalized_score numeric(6, 2),
  add column if not exists performance_tier text
    check (performance_tier is null or performance_tier in ('HIGH', 'CORE', 'LOW'));

create table if not exists manager_cycle_metrics (
  cycle_id uuid not null references review_cycles (id) on delete cascade,
  manager_id uuid not null references users (id) on delete cascade,
  bias_index numeric(6, 2),
  updated_at timestamptz not null default now(),
  primary key (cycle_id, manager_id)
);
