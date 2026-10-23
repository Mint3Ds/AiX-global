import { describe, expect, it } from "vitest";
import {
  assertReplyApproval,
  canBatchApproveReply,
  isPossibleRecurrence,
  partialReplyWarning,
} from "../src/domain/replies";

describe("reply and recurrence safeguards", () => {
  it("requires explicit partial approval and rejects claims that all concerns are fixed", () => {
    const warning = partialReplyWarning(["Insect sighting near the sink"]);
    expect(warning).toMatch(/unresolved/);
    expect(() =>
      assertReplyApproval(
        "The AC was checked; the insect concern is under review.",
        ["Insect sighting"],
        false,
      ),
    ).toThrow(/Explicitly approve/);
    expect(() =>
      assertReplyApproval(
        "Everything is fixed now.",
        ["Insect sighting"],
        true,
      ),
    ).toThrow(/all concerns/);
    expect(() =>
      assertReplyApproval(
        "The AC was checked; the insect concern remains under review.",
        ["Insect sighting"],
        true,
      ),
    ).not.toThrow();
  });
  it("keeps high-severity and partial replies out of batch approval", () => {
    expect(canBatchApproveReply("draft", null, 2)).toBe(true);
    expect(canBatchApproveReply("draft", "Unresolved pest concern", 2)).toBe(
      false,
    );
    expect(canBatchApproveReply("draft", null, 3)).toBe(false);
    expect(canBatchApproveReply("approved_ready", null, 1)).toBe(false);
  });
  it("flags only reviews ingested after a verified resolution", () => {
    const resolved = new Date("2026-10-22T12:00:00Z");
    expect(
      isPossibleRecurrence(new Date("2026-10-23T12:00:00Z"), resolved),
    ).toBe(true);
    expect(
      isPossibleRecurrence(new Date("2026-10-21T12:00:00Z"), resolved),
    ).toBe(false);
    expect(isPossibleRecurrence(new Date("2026-10-23T12:00:00Z"), null)).toBe(
      false,
    );
  });
});
