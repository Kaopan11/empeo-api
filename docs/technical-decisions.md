# Technical Decisions & Trade-offs

This note matches **empeo-api on `main`** (through deploy, HR dashboard,
employee publish gate, and mixed demo seed). Empeo is a small
performance-review API: managers score direct reports in an open cycle; HR
calibrates with fairness stats, can unlock overdue rows, and can publish
results so employees see their review.

---

## 1. Evaluation status lives in the database, not in the API

**Decision.** Every direct report in the open cycle has an `evaluations` row.
`GET /api/evaluations/team` returns `status` from that row
(`PENDING | DRAFT | SUBMITTED | OVERDUE`). A missing row is a **500**, not a
synthetic `PENDING`.

**Rejected.** Treat “no row” as pending. That hid seed bugs, made Save/Submit
impossible without an `evaluationId`, and diverged from the DB enum.

**Trade-off.** Seed (or a cycle-open job) must create one row per report. The
API never invents state. Incomplete data fails loudly.

---

## 2. Managers may write only PENDING and DRAFT

**Decision.** Save and submit are allowed only when `evaluation.status` is
`PENDING` or `DRAFT`, and the cycle is `IN_PROGRESS`. Save → `DRAFT`. Submit →
`SUBMITTED` + `submitted_at`. `SUBMITTED` → 409. `OVERDUE` → 409
(`Evaluation is overdue; contact HR`).

**Rejected.** Let managers edit submitted or overdue rows. That would mix
manager workflow with HR correction.

**Trade-off.** Overdue recovery is `POST /api/cycles/:cycleId/resolve-overdue`
(HR), not a manager retry. The manager UI only needs `canWrite` from the team
list.

---

## 3. Scores are written on save/submit; the team list does not return them

**Decision.** `evaluation_scores` are replaced (delete + insert) on save and
submit. `GET /team` returns identity + `evaluationId` + `status` only.

**Rejected.** GET evaluation detail on every member click, or embed scores in
the team payload.

**Trade-off.** The manager form does not hydrate a draft after reload (web
resets the form when switching people). Sidebar status is live via refetch +
60s poll. Score round-trip for the form is still out of scope.

---

## 4. Fairness is computed in-process, then persisted

**Decision.** Recalculate the **whole cycle** after a successful **submit**,
and again after **resolve-overdue** if any overdue row is submitted:

- Input: `SUBMITTED` rows with non-null `total_raw_score`
- Team z-score: `(raw − μ_team) / σ_team` (population SD, divide by `n`)
- Tier: `HIGH` if z > 0.5, `LOW` if z < −0.5, else `CORE`
- Bias index per manager: `(μ_team − μ_org) / σ_org`
- Persist `normalized_score` + `performance_tier` on `evaluations`, and
  `bias_index` on `manager_cycle_metrics` (one row per manager per cycle)

Edge cases: empty org → no metrics; `σ_org = 0` → bias `0`; one teammate or
identical scores → z `0`, tier `CORE`.

**Rejected.** Compute-on-read only. HR and employee views would disagree over
time.

**Rejected.** Recalculate only the submitting manager. Org mean/SD would drift
for everyone else.

**Rejected.** Terciles for High/Core/Low. Unstable on small teams.

**Trade-off.** Submit writes more rows (loop per evaluation). Fine at demo
scale. No job queue: fairness stays on the HTTP path.

HR dashboard maps bias with the same ±0.5 band: ≥ +0.5 “Too lenient”,
≤ −0.5 “Strict”.

---

## 5. Five layers, repositories instead of `lib`

**Decision.** `routes` → `services` → `domain` + `repositories`. The Supabase
client lives in `repositories/supabase.ts`. Domain does not import Supabase.
Empty `controllers/` and `middlewares/` stay as placeholders.

**Rejected.** Keep all feature files at `src/*.ts`.

**Rejected.** A separate `lib` folder for the client — same job as a
repository module.

**Trade-off.** More files per feature. HTTP handlers stay thin; domain tests
do not need a database.

---

## 6. Demo seed is mixed statuses for HR, not an all-PENDING sandbox

**Decision (current `main`).** Seed every direct report of Somchai and Wichai,
then mix statuses so the HR dashboard is demoable without clicking through
seventeen submits:

- 13 `SUBMITTED` with scores, feedback, and precomputed fairness
- 1 `DRAFT` (Finn)
- 2 `OVERDUE` (Hiro, Owen)
- 1 `PENDING` (Quinn)

Somchai’s submitted scores are high (lenient); Wichai’s are low (strict).
The seed file also realigns `performance_tier` / evaluation-status enums so a
SQL Editor re-run matches the app.

**Rejected as the live demo seed.** All-PENDING with no scores (useful while
building manager Save/Submit; useless for HR calibration screenshots).

**Trade-off.** Seed is no longer “what a brand-new cycle looks like.” It is a
fixture. Runtime rules still apply: managers cannot write OVERDUE/SUBMITTED;
fairness still recalculates on the next real submit.

---

## 7. Overdue is unlocked by HR, with a submit-or-draft rule

**Decision.** `resolve-overdue` loads each OVERDUE row and its scores. If the
body would pass **submit** validation (including leniency feedback), the row
becomes `SUBMITTED`. Otherwise it becomes `DRAFT` so the manager can finish
it. If any row is submitted, fairness runs for the cycle.

**Rejected.** Auto-submit every overdue row, or drop them back to PENDING
without looking at scores.

**Trade-off.** Empty overdue rows (no scores in seed for Hiro/Owen) unlock to
**DRAFT**, which is the intended demo: HR unblocks, manager still has to
write.

---

## 8. Publish is a cycle flag; employees are gated until then

**Decision.** HR `POST /api/cycles/:cycleId/publish` with `x-user-id` of an
HR user sets cycle `PUBLISHED` + `published_at` (or back to `IN_PROGRESS`
when unpublished). Employee `GET /api/me/review` uses:

- `waiting_publish` if the cycle is not published
- `waiting_submit` if published but that person is not `SUBMITTED`
- `visible` only when published **and** submitted

**Rejected.** Per-person email or independent publish flags. No mailer.

**Trade-off.** Unpublish is blunt: every employee loses the result together.
Auth is a header UUID + role lookup, not sessions/JWT — enough for the demo,
not for production.

---

## 9. Render: listen on `PORT`, start with `ts-node`

**Decision.** `app.ts` uses `Number(process.env.PORT) || 4000`. Production
start is `node --require ts-node/register/transpile-only src/app.ts`. `ts-node`
is a runtime dependency so Render can start TypeScript without a `dist/`
build.

**Rejected.** Hard-coded `4000` (Render health checks miss the process).
`npm run dev` (`ts-node-dev`) as the start command.

**Trade-off.** No `tsc` emit on deploy. If Render omits devDependencies,
`typescript` must still be installable (`NPM_CONFIG_PRODUCTION=false` or
move it to `dependencies`). Compile-to-dist is the upgrade when that becomes
painful.

---

## What we skipped (and when to add it)

| Skipped | Add when |
|---------|----------|
| GET evaluation scores for the manager form | Managers need to resume a draft after refresh |
| Supabase Realtime | Poll 60s is not enough |
| Fairness job / batch SQL | Submit latency or row count hurts |
| Real auth (JWT/sessions) | Anything not a classroom demo |
| `tsc` → `dist` on Render | `ts-node` start is no longer acceptable |
| Per-employee notify on publish | Product wants mail/in-app alerts |

These are upgrades, not unfinished promises of the current API contract.
