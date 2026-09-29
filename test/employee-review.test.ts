import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  companyAverage,
  employeeReviewGate,
  firstFeedback,
} from "../src/domain/employee-review";

describe("employeeReviewGate", () => {
  it("hides results until the cycle is published", () => {
    assert.equal(employeeReviewGate(false, "SUBMITTED"), "waiting_publish");
    assert.equal(employeeReviewGate(true, "OVERDUE"), "waiting_submit");
    assert.equal(employeeReviewGate(true, "SUBMITTED"), "visible");
  });
});

describe("firstFeedback", () => {
  it("returns the first non-empty feedback", () => {
    assert.equal(firstFeedback([{ feedback: "  " }, { feedback: "ok" }]), "ok");
    assert.equal(firstFeedback([{ feedback: null }]), null);
  });
});

describe("companyAverage", () => {
  it("averages submitted raw scores", () => {
    assert.equal(companyAverage([5, 4, null]), 4.5);
    assert.equal(companyAverage([]), null);
  });
});
