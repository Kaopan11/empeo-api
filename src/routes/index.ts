import type { Express } from "express";
import { listEmployees } from "../repositories/employees.repository";
import { getCycleDashboard } from "../services/dashboard.service";
import { resolveOverdueEvaluations, writeEvaluation } from "../services/evaluations.service";
import { getManagerCycleMetrics } from "../services/fairness.service";
import { getMyReview } from "../services/me-review.service";
import { publishCycle } from "../services/publish.service";
import { getTeamEvaluations } from "../services/team.service";
import { getCycleById } from "../repositories/cycles.repository";
import { cycleIdFromParam } from "../domain/ids";

export function registerRoutes(app: Express) {
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/employees", async (_req, res) => {
    const result = await listEmployees();
    if (!result.ok) {
      res.status(500).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.get("/api/evaluations/team", async (req, res) => {
    const result = await getTeamEvaluations(req.query.managerId);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.get("/api/cycles/:cycleId/dashboard", async (req, res) => {
    const cycleId = typeof req.params.cycleId === "string" ? req.params.cycleId : "";
    const result = await getCycleDashboard(cycleId);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.get("/api/cycles/:cycleId", async (req, res) => {
    const cycleId = typeof req.params.cycleId === "string" ? req.params.cycleId : "";
    const id = cycleIdFromParam(cycleId);
    if (!id) {
      res.status(400).json({ error: "cycleId must be a UUID" });
      return;
    }
    const result = await getCycleById(id);
    if (!result.ok) {
      if ("notFound" in result) {
        res.status(404).json({ error: "Cycle not found" });
        return;
      }
      res.status(500).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.post("/api/cycles/:cycleId/publish", async (req, res) => {
    const cycleId = typeof req.params.cycleId === "string" ? req.params.cycleId : "";
    const result = await publishCycle(cycleId, req.body, req.headers["x-user-id"]);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.get("/api/me/review", async (req, res) => {
    const cycleId =
      typeof req.query.cycleId === "string" ? req.query.cycleId : "";
    const result = await getMyReview(cycleId, req.headers["x-user-id"]);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.post("/api/cycles/:cycleId/resolve-overdue", async (req, res) => {
    const cycleId = typeof req.params.cycleId === "string" ? req.params.cycleId : "";
    const result = await resolveOverdueEvaluations(cycleId);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.get("/api/cycles/:cycleId/manager-metrics", async (req, res) => {
    const cycleId = typeof req.params.cycleId === "string" ? req.params.cycleId : "";
    const result = await getManagerCycleMetrics(cycleId);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.post("/api/evaluations/:id/save", async (req, res) => {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const result = await writeEvaluation(id, req.body, "save");
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  app.post("/api/evaluations/:id/submit", async (req, res) => {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const result = await writeEvaluation(id, req.body, "submit");
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });
}
