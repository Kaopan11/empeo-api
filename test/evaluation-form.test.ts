import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { draftEvaluationSchema, evaluationSchema, isLenient } from "../src/types/evaluation-schema";

describe("evaluation form schemas", () => {
  it("5 and 5 is lenient and needs feedback on submit", () => {
    assert.equal(isLenient({ technical: "5", collaboration: "5" }), true);
    const parsed = evaluationSchema.safeParse({
      technical: "5",
      collaboration: "5",
      feedback: "  ",
    });
    assert.equal(parsed.success, false);
  });

  it("5 with 4 or lower on the other criterion is not lenient", () => {
    assert.equal(isLenient({ technical: "5", collaboration: "4" }), false);
    const parsed = evaluationSchema.safeParse({
      technical: "5",
      collaboration: "4",
      feedback: "",
    });
    assert.equal(parsed.success, true);
  });

  it("draft save allows empty feedback and requires 1-5 ratings", () => {
    const ok = draftEvaluationSchema.safeParse({
      technical: "3",
      collaboration: "2",
      feedback: "",
    });
    assert.equal(ok.success, true);

    const bad = draftEvaluationSchema.safeParse({
      technical: "6",
      collaboration: "2",
      feedback: "",
    });
    assert.equal(bad.success, false);
  });
});
