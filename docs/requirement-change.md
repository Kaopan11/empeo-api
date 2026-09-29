# The Requirement Change

The API did not start with the rules that are on `main` today. Two product
shifts mattered more than the rest: **what “pending” means**, and **what the
seed is for**. Everything else (fairness, HR overdue, publish) hangs off those.

---

## Change 1 — “No row” is not pending

### What we thought at first

A missing `evaluations` row meant the manager had not started. The team API
could invent `PENDING`. Hiro and Owen had no rows in an early seed. The
manager UI said “No evaluation started yet” and blocked Save.

### What we ship now

Every direct report in the open cycle **must** have a row. Status is always
the database enum: `PENDING | DRAFT | SUBMITTED | OVERDUE`. A missing row is a
**500** (data bug after seed), not a fake pending.

Managers **can write** `PENDING` and `DRAFT`. `PENDING` is “not saved yet,”
not “no evaluation exists.” Save turns `PENDING` → `DRAFT`. Submit →
`SUBMITTED`. `SUBMITTED` and `OVERDUE` are 409 for managers.

### Why it changed

- The DB already defaulted new rows to `PENDING`. Inventing pending in the API
  hid broken seed data.
- Save/Submit need an `evaluationId`. No row meant no write path.
- The sidebar had to stay in sync after save without a full page reload. That
  only works if status is a real column, not a missing join.

### What we did not add

No GET of scores on member change. The form still resets empty. Status is
refetched (and polled every 60s on the web). Loading a draft from the DB is
still a later requirement.

---

## Change 2 — Seed is an HR fixture, not a blank cycle

### What we thought at first

After the pending-row rule, seed was a **clean sandbox**: every Somchai and
Wichai report `PENDING`, no `evaluation_scores`. Scores existed only after a
manager saved. That matched “demo the write path.”

### What we ship now

Seed is mixed on purpose so HR and employee screens work without seventeen
manual submits:

| Status | Who (demo) |
|--------|------------|
| SUBMITTED (13) | Most of Engineering (lenient) and Sales (strict), with scores + fairness |
| DRAFT | Finn |
| OVERDUE | Hiro, Owen |
| PENDING | Quinn |

### Why it changed

HR dashboard, bias labels, resolve-overdue, and employee publish need
**already-submitted** people and a couple of overdue/pending rows. An
all-PENDING seed made those screens empty.

The **runtime rules did not revert**. Managers still cannot write OVERDUE or
SUBMITTED. The next real submit still recalculates fairness for the whole
cycle.

### Trade-off

Reviewers must not treat seed as “day one of a cycle.” It is a screenshot
fixture. SQL Editor after re-seed should match the HR sidebar, not a blank
manager queue.

---

## Related changes (same era, not the core story)

These landed on `main` after the two shifts above. They are consequences, not
a third rewrite of pending.

- **Fairness** persists on submit (and after HR submits via resolve-overdue):
  team z-score, HIGH/CORE/LOW, manager `bias_index`.
- **HR** `resolve-overdue`: valid scores → `SUBMITTED`, otherwise → `DRAFT`.
- **Publish** is a cycle flag. Employees see results only when the cycle is
  `PUBLISHED` **and** their row is `SUBMITTED` (`waiting_publish` /
  `waiting_submit` / `visible`).
- **Auth** for publish / me-review is `x-user-id` + role, not JWT.

---

## Timeline (short)

1. Team list + invented PENDING if no row
2. Real rows; PENDING writable; no synthetic status
3. All-PENDING seed while proving Save/Submit
4. Mixed seed + fairness + HR + publish on `main`

The product still has one status machine. What changed is **where pending
lives** (the row, not the absence of a row) and **what seed is allowed to
pretend** (a live cycle vs an HR demo tape).
