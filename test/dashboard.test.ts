import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BIAS_WATCH_THRESHOLD,
  biasLabel,
  buildDashboard,
  type DashboardEvaluation,
  type DashboardUser,
} from "../src/domain/dashboard";

const somchai = "a1000000-0000-4000-8000-000000000002";
const wichai = "a1000000-0000-4000-8000-000000000003";
const alice = "a1000000-0000-4000-8000-000000000011";
const ivy = "a1000000-0000-4000-8000-000000000021";
const finn = "a1000000-0000-4000-8000-000000000016";
const owen = "a1000000-0000-4000-8000-000000000027";

const users: DashboardUser[] = [
  { id: somchai, name: "Somchai", department: "Engineering", managerId: null },
  { id: wichai, name: "Wichai", department: "Sales", managerId: null },
  { id: alice, name: "Alice", department: "Engineering", managerId: somchai },
  { id: ivy, name: "Ivy", department: "Sales", managerId: wichai },
  { id: finn, name: "Finn", department: "Engineering", managerId: somchai },
  { id: owen, name: "Owen", department: "Sales", managerId: wichai },
];

describe("biasLabel", () => {
  it("flags lenient and strict at the watch threshold", () => {
    assert.equal(biasLabel(BIAS_WATCH_THRESHOLD), "Too lenient");
    assert.equal(biasLabel(-BIAS_WATCH_THRESHOLD), "Strict");
    assert.equal(biasLabel(0.49), null);
  });
});

describe("buildDashboard", () => {
  it("counts kpis, distribution percents, and talent from evaluations", () => {
    const evaluations: DashboardEvaluation[] = [
      {
        id: "e1",
        reviewerId: somchai,
        revieweeId: alice,
        status: "SUBMITTED",
        totalRawScore: 5,
        normalizedScore: 1.1,
        performanceTier: "HIGH",
      },
      {
        id: "e2",
        reviewerId: somchai,
        revieweeId: finn,
        status: "DRAFT",
        totalRawScore: 3,
        normalizedScore: null,
        performanceTier: null,
      },
      {
        id: "e3",
        reviewerId: wichai,
        revieweeId: ivy,
        status: "SUBMITTED",
        totalRawScore: 2,
        normalizedScore: -0.8,
        performanceTier: "LOW",
      },
      {
        id: "e4",
        reviewerId: wichai,
        revieweeId: owen,
        status: "OVERDUE",
        totalRawScore: null,
        normalizedScore: null,
        performanceTier: null,
      },
    ];
    const result = buildDashboard({
      cycle: {
        id: "c1",
        name: "H2",
        endDate: "2026-10-02",
        status: "IN_PROGRESS",
        publishedAt: null,
      },
      evaluations,
      users,
      managerMetrics: [
        { managerId: somchai, biasIndex: 1.2 },
        { managerId: wichai, biasIndex: -0.9 },
      ],
      now: new Date("2026-09-29T00:00:00.000Z"),
    });
    assert.equal(result.kpis.totalEmployees, 4);
    assert.equal(result.kpis.departments, 2);
    assert.equal(result.kpis.submitted, 2);
    assert.equal(result.kpis.inProgress, 1);
    assert.equal(result.kpis.overdue, 1);
    assert.equal(result.kpis.completionRate, 50);
    assert.equal(result.kpis.daysUntilEnd, 3);
    assert.equal(result.distribution.high.percent, 50);
    assert.equal(result.distribution.low.percent, 50);
    assert.equal(result.distribution.core.percent, 0);
    assert.equal(result.distribution.averageNormalized, 0.15);
    assert.equal(result.managers[0]?.name, "Somchai");
    assert.equal(result.managers[0]?.reportCount, 2);
    assert.equal(result.managers[0]?.label, "Too lenient");
    assert.equal(result.talent[0]?.name, "Alice");
    assert.equal(result.talent[0]?.tier, "HIGH");
  });
});
