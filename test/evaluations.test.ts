import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluationIdFromParam,
  scoreRows,
  totalRawScore,
} from "../src/evaluations";

describe("evaluationIdFromParam", () => {
  it("accepts a UUID", () => {
    assert.equal(
      evaluationIdFromParam("c1000000-0000-4000-8000-000000000016"),
      "c1000000-0000-4000-8000-000000000016",
    );
  });

  it("rejects invalid ids", () => {
    assert.equal(evaluationIdFromParam("not-a-uuid"), null);
  });
});

describe("totalRawScore", () => {
  it("averages two ratings to two decimal places", () => {
    assert.equal(totalRawScore("5", "5"), 5);
    assert.equal(totalRawScore("5", "4"), 4.5);
    assert.equal(totalRawScore("3", "2"), 2.5);
  });
});

describe("scoreRows", () => {
  it("builds two weighted score rows with shared feedback", () => {
    assert.deepEqual(scoreRows("eval-1", "4", "5", "Good work"), [
      {
        evaluation_id: "eval-1",
        criteria_name: "Technical Execution",
        weight: 0.5,
        score: 4,
        feedback: "Good work",
      },
      {
        evaluation_id: "eval-1",
        criteria_name: "Collaboration",
        weight: 0.5,
        score: 5,
        feedback: "Good work",
      },
    ]);
  });
});
