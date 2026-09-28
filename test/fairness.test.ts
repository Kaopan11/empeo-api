import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  biasIndex,
  computeFairness,
  populationMean,
  populationStdDev,
  teamZ,
  tierFromZ,
  type SubmittedRow,
} from "../src/domain/fairness";

describe("populationMean", () => {
  it("returns null for empty input", () => {
    assert.equal(populationMean([]), null);
  });

  it("averages values", () => {
    assert.equal(populationMean([2, 4]), 3);
  });
});

describe("populationStdDev", () => {
  it("returns 0 for empty or single value", () => {
    assert.equal(populationStdDev([]), 0);
    assert.equal(populationStdDev([5]), 0);
  });

  it("uses population formula", () => {
    assert.equal(populationStdDev([2, 4]), 1);
  });
});

describe("teamZ and tierFromZ", () => {
  it("returns 0 z and CORE when team SD is 0", () => {
    assert.equal(teamZ(4.5, 4.5, 0), 0);
    assert.equal(tierFromZ(0), "CORE");
  });

  it("assigns HIGH and LOW from fixed bands", () => {
    assert.equal(tierFromZ(0.51), "HIGH");
    assert.equal(tierFromZ(-0.51), "LOW");
    assert.equal(tierFromZ(0.2), "CORE");
  });
});

describe("biasIndex", () => {
  it("returns 0 when org SD is 0", () => {
    assert.equal(biasIndex(3, 3, 0), 0);
  });

  it("computes signed SD from org mean", () => {
    assert.equal(biasIndex(4, 3, 1), 1);
    assert.equal(biasIndex(2, 3, 1), -1);
  });
});

describe("computeFairness", () => {
  it("returns empty when org has no submitted rows", () => {
    assert.deepEqual(computeFairness([]), {
      evaluationUpdates: [],
      managerMetrics: [],
    });
  });

  it("handles single submitted evaluation in org (R4)", () => {
    const rows: SubmittedRow[] = [
      {
        evaluationId: "e1",
        reviewerId: "m1",
        totalRawScore: 4,
      },
    ];
    const result = computeFairness(rows);
    assert.equal(result.managerMetrics.length, 1);
    assert.equal(result.managerMetrics[0]?.biasIndex, 0);
    assert.equal(result.evaluationUpdates[0]?.normalizedScore, 0);
    assert.equal(result.evaluationUpdates[0]?.performanceTier, "CORE");
  });

  it("computes team z and manager bias across teams", () => {
    const rows: SubmittedRow[] = [
      { evaluationId: "e1", reviewerId: "m1", totalRawScore: 5 },
      { evaluationId: "e2", reviewerId: "m1", totalRawScore: 3 },
      { evaluationId: "e3", reviewerId: "m2", totalRawScore: 2 },
      { evaluationId: "e4", reviewerId: "m2", totalRawScore: 2 },
    ];
    const orgMean = 3;
    const orgStd = populationStdDev([5, 3, 2, 2], orgMean);
    const result = computeFairness(rows);
    const m1 = result.managerMetrics.find((m) => m.managerId === "m1");
    const m2 = result.managerMetrics.find((m) => m.managerId === "m2");
    assert.equal(m1?.biasIndex, biasIndex(4, orgMean, orgStd));
    assert.equal(m2?.biasIndex, biasIndex(2, orgMean, orgStd));
    const high = result.evaluationUpdates.find((u) => u.evaluationId === "e1");
    assert.equal(high?.performanceTier, "HIGH");
  });

  it("sets CORE when team scores are identical (R5)", () => {
    const rows: SubmittedRow[] = [
      { evaluationId: "e1", reviewerId: "m1", totalRawScore: 4 },
      { evaluationId: "e2", reviewerId: "m1", totalRawScore: 4 },
    ];
    const result = computeFairness(rows);
    assert.ok(
      result.evaluationUpdates.every(
        (u) => u.normalizedScore === 0 && u.performanceTier === "CORE",
      ),
    );
  });
});
