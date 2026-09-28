import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { managerIdFromQuery } from "../src/domain/ids";
import { buildTeamMembers } from "../src/domain/team";

const alice = {
  id: "a1000000-0000-4000-8000-000000000011",
  name: "Alice",
  email: "alice@empeo.test",
  department: "Engineering",
};
const ben = {
  id: "a1000000-0000-4000-8000-000000000012",
  name: "Ben",
  email: "ben@empeo.test",
  department: "Engineering",
};
const hiro = {
  id: "a1000000-0000-4000-8000-000000000018",
  name: "Hiro",
  email: "hiro@empeo.test",
  department: "Engineering",
};

describe("managerIdFromQuery", () => {
  it("rejects a missing or non-UUID managerId", () => {
    assert.equal(managerIdFromQuery(undefined), null);
    assert.equal(managerIdFromQuery(""), null);
    assert.equal(managerIdFromQuery("somchai"), null);
    assert.equal(managerIdFromQuery(["a1000000-0000-4000-8000-000000000002"]), null);
  });

  it("accepts one UUID", () => {
    assert.equal(
      managerIdFromQuery("a1000000-0000-4000-8000-000000000002"),
      "a1000000-0000-4000-8000-000000000002",
    );
  });
});

describe("buildTeamMembers", () => {
  it("fails when a direct report has no evaluation row", () => {
    const result = buildTeamMembers([alice], []);
    assert.equal(result.ok, false);
  });

  it("returns status from the database row", () => {
    const result = buildTeamMembers(
      [ben, alice, hiro],
      [
        { id: "c1", reviewee_id: alice.id, status: "SUBMITTED" },
        { id: "c2", reviewee_id: ben.id, status: "DRAFT" },
        { id: "c3", reviewee_id: hiro.id, status: "PENDING" },
      ],
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(
      result.members.map((member) => [member.name, member.evaluationId, member.status]),
      [
        ["Alice", "c1", "SUBMITTED"],
        ["Ben", "c2", "DRAFT"],
        ["Hiro", "c3", "PENDING"],
      ],
    );
  });

  it("includes OVERDUE from the database row", () => {
    const result = buildTeamMembers([alice], [
      { id: "c1", reviewee_id: alice.id, status: "OVERDUE" },
    ]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.members[0]?.status, "OVERDUE");
  });

  it("fails when one person has two evaluations or an unknown status", () => {
    const duplicate = buildTeamMembers([alice], [
      { id: "c1", reviewee_id: alice.id, status: "DRAFT" },
      { id: "c2", reviewee_id: alice.id, status: "SUBMITTED" },
    ]);
    assert.equal(duplicate.ok, false);

    const unknown = buildTeamMembers([alice], [
      { id: "c1", reviewee_id: alice.id, status: "APPROVED" },
    ]);
    assert.equal(unknown.ok, false);
  });
});
