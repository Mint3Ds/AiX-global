import { describe, expect, it, vi } from "vitest";
import {
  databaseErrorCode,
  isDatabaseOperationError,
  isTransientDatabaseError,
  retryDatabaseRead,
} from "../src/data/database-retry";

describe("database read resilience", () => {
  it("finds PostgreSQL codes inside wrapped query errors", () => {
    const error = Object.assign(new Error("Failed query"), {
      cause: Object.assign(new Error("socket reset"), { code: "ECONNRESET" }),
    });

    expect(databaseErrorCode(error)).toBe("ECONNRESET");
    expect(isTransientDatabaseError(error)).toBe(true);
    expect(isDatabaseOperationError(error)).toBe(true);
  });

  it("retries transient read failures with bounded backoff", async () => {
    const wait = vi.fn(async () => undefined);
    const read = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(Object.assign(new Error("socket reset"), { code: "ECONNRESET" }))
      .mockRejectedValueOnce(Object.assign(new Error("server restarting"), { code: "57P01" }))
      .mockResolvedValue("workspace state");

    await expect(
      retryDatabaseRead(read, { retries: 2, delayMs: 10, wait }),
    ).resolves.toBe("workspace state");
    expect(read).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[10], [20]]);
  });

  it("does not retry permanent schema or query errors", async () => {
    const read = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(Object.assign(new Error("missing table"), { code: "42P01" }));
    const wait = vi.fn(async () => undefined);

    await expect(retryDatabaseRead(read, { wait })).rejects.toThrow("missing table");
    expect(read).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it("stops after the configured number of retries", async () => {
    const read = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" }));

    await expect(
      retryDatabaseRead(read, { retries: 1, wait: async () => undefined }),
    ).rejects.toThrow("connection refused");
    expect(read).toHaveBeenCalledTimes(2);
  });
});
