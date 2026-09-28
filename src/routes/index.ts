import type { Express } from "express";
import { listEmployees } from "../repositories/employees.repository";
import { getManagerCycleMetrics } from "../services/fairness.service";
import { writeEvaluation } from "../services/evaluations.service";
import { getTeamEvaluations } from "../services/team.service";

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
