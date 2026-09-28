import cors from "cors";
import express from "express";
import { supabase } from "./lib/supabase";
import { cycleIdFromParam } from "./fairness";
import { writeEvaluation } from "./evaluations";
import { buildTeamMembers, managerIdFromQuery } from "./team";
import type { Employee, TeamEvaluations } from "./types";

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/employees", async (_req, res) => {
  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, email, department")
    .overrideTypes<Employee[], { merge: false }>();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

app.get("/api/evaluations/team", async (req, res) => {
  const managerId = managerIdFromQuery(req.query.managerId);
  if (!managerId) {
    res.status(400).json({ error: "managerId must be a UUID" });
    return;
  }

  const { data: manager, error: managerError } = await supabase
    .from("users")
    .select("id")
    .eq("id", managerId)
    .maybeSingle();
  if (managerError) {
    res.status(500).json({ error: managerError.message });
    return;
  }
  if (!manager) {
    res.status(404).json({ error: "Manager not found" });
    return;
  }

  const { data: cycles, error: cycleError } = await supabase
    .from("review_cycles")
    .select("id, name")
    .eq("status", "IN_PROGRESS")
    .overrideTypes<{ id: string; name: string }[], { merge: false }>();
  if (cycleError) {
    res.status(500).json({ error: cycleError.message });
    return;
  }
  if (!cycles || cycles.length !== 1) {
    res.status(409).json({ error: "Expected exactly one in-progress review cycle" });
    return;
  }
  const cycle = cycles[0];
  if (!cycle) {
    res.status(409).json({ error: "Expected exactly one in-progress review cycle" });
    return;
  }

  const { data: reports, error: reportsError } = await supabase
    .from("users")
    .select("id, name, email, department")
    .eq("manager_id", managerId);
  if (reportsError) {
    res.status(500).json({ error: reportsError.message });
    return;
  }

  const { data: evaluations, error: evaluationsError } = await supabase
    .from("evaluations")
    .select("id, reviewee_id, status")
    .eq("cycle_id", cycle.id)
    .eq("reviewer_id", managerId);
  if (evaluationsError) {
    res.status(500).json({ error: evaluationsError.message });
    return;
  }

  const built = buildTeamMembers(reports ?? [], evaluations ?? []);
  if (!built.ok) {
    res.status(500).json({ error: built.error });
    return;
  }

  const body: TeamEvaluations = {
    cycle: { id: cycle.id, name: cycle.name },
    members: built.members,
  };
  res.json(body);
});

app.get("/api/cycles/:cycleId/manager-metrics", async (req, res) => {
  const cycleId = cycleIdFromParam(
    typeof req.params.cycleId === "string" ? req.params.cycleId : "",
  );
  if (!cycleId) {
    res.status(400).json({ error: "cycleId must be a UUID" });
    return;
  }

  const { data, error } = await supabase
    .from("manager_cycle_metrics")
    .select("manager_id, bias_index, updated_at")
    .eq("cycle_id", cycleId)
    .overrideTypes<
      { manager_id: string; bias_index: number | null; updated_at: string }[],
      { merge: false }
    >();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({
    cycleId,
    managers: (data ?? []).map((row) => ({
      managerId: row.manager_id,
      biasIndex: row.bias_index,
      updatedAt: row.updated_at,
    })),
  });
});

app.post("/api/evaluations/:id/save", async (req, res) => {
  const id = req.params.id;
  const result = await writeEvaluation(
    supabase,
    typeof id === "string" ? id : "",
    req.body,
    "save",
  );
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(result.data);
});

app.post("/api/evaluations/:id/submit", async (req, res) => {
  const id = req.params.id;
  const result = await writeEvaluation(
    supabase,
    typeof id === "string" ? id : "",
    req.body,
    "submit",
  );
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(result.data);
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
