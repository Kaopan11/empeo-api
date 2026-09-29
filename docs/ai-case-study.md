# AI Collaboration & Verification

How we used Cursor (agent + chat) to build empeo-api, where it helped, where
it failed, and how we checked the work before it reached `main`.

---

## What we used

| Practice | Role |
|----------|------|
| **Grill** (`/grill-me`) | Lock product rules before code: pending vs missing row, fairness formulas, persist vs compute-on-read, seed sandbox vs HR fixture |
| **Ponytail** | Shortest diff: no Realtime, no GET scores, no extra frameworks |
| **Implement** | Apply a pasted spec on a named branch; run tests; **no commit** unless we asked |
| **Ask vs Agent** | Ask for drafts and “why”; Agent only when we wanted files written |

The agent did not invent the domain. We brought tickets (team list, save/submit,
fairness, HR, publish). The agent proposed defaults; we accepted or overrode
them in grill rounds.

---

## Where AI helped

**Turning a ticket into an API contract.** “Live status without F5” became
refetch `GET /team` + 60s poll, `canWrite` only for `PENDING`/`DRAFT`, and 409
on `OVERDUE` — not a Supabase Realtime channel.

**Edge cases we would have missed.** Fairness grill forced `σ = 0`, one
submitted row, and empty org into explicit rules (z = 0, bias = 0, CORE)
instead of divide-by-zero 500s.

**Mechanical refactors.** Moving `src/*.ts` into routes / services / domain /
repositories was mostly import shuffling. Tests still passed after path
updates.

**Docs.** Technical-decisions and requirement-change drafts were generated
from the repo + git history on `main`, then edited by us.

---

## Where AI got it wrong (and how we caught it)

**1. Synthetic PENDING.** Early team API treated “no row” as pending. That
matched a sloppy reading of the ticket, not the DB enum. We caught it when
Hiro/Owen could not Save and when `seed.sql` still showed SUBMITTED after we
thought we had gone PENDING-only.

**2. Changing the file is not changing the database.** We edited `seed.sql`
and expected the UI to follow. The agent (Ask mode) could not run SQL. Manual
QA + SQL Editor was the fix. Later we **reverted** all-PENDING seed on
purpose so HR had a mixed fixture — the “wrong” mixed seed became the
requirement again.

**3. Architecture after the fact.** Code landed flat (`src/evaluations.ts`,
queries in `app.ts`). Five layers was our rule, not the agent’s default.
We paid a dedicated refactor branch.

**4. Shell and OS.** `&&` in PowerShell failed. Deploy needed `PORT` and
`npm start`; the agent only named that when we asked about Render.

**5. Scope creep vs YAGNI.** Ponytail skipped GET scores and Realtime. That
was correct for the ticket. It is still a product gap (drafts empty after
reload). AI will happily leave gaps you told it to leave — reviewers may
still call them bugs.

---

## How we verified (not “the AI said it works”)

| Check | What it proved |
|-------|----------------|
| `npm test` in empeo-api | Domain: team builder, schemas, fairness bands, dashboard helpers |
| `npx tsc --noEmit` | Import graph after the five-layer move |
| Re-seed on the **same** Supabase project as `SUPABASE_URL` | UI status matched SQL |
| Manual manager path | Pending → Save → Draft → Submit → Submitted without F5 |
| Manual HR / employee path | Mixed seed, resolve-overdue, publish gate |
| `/health` on Render | Process bound `PORT`; env present |

We did **not** treat a green agent summary as done. Several times the summary
was ahead of the remote DB or of `main`.

---

## What we would do again

1. Grill the status machine and fairness edges **before** implement.  
2. Paste one spec (branch name, no-commit, files, tests).  
3. Run tests locally; re-seed ourselves; click the UI.  
4. Keep “skipped / add when” in the ticket so the next human knows the gaps
   are intentional.

## What we would not trust the agent with alone

- Production secrets and Render env  
- “The seed is applied” without opening Table Editor  
- Auth beyond `x-user-id`  
- Saying the architecture matches a layer diagram we never put in the repo

---

## One-line case

AI was a fast typist with a good memory of the last spec. **We** owned the
product rules, the seed vs runtime distinction, and the verification loop.
The useful collaboration was grill → small implement → test → human QA, not
“generate the whole API.”
