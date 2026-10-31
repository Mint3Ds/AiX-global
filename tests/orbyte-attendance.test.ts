import { describe, expect, it } from "vitest";
import { getSimulatedAttendance } from "../src/integrations/orbyte/attendance";

const context = (
  input: Partial<Parameters<typeof getSimulatedAttendance>[0]> = {},
) =>
  getSimulatedAttendance({
    employeeId: "hotel-employee-2",
    orbyteStaffId: "ORB-HOTEL-EMPLOYEE-2",
    dueAt: "2026-11-02T10:00",
    timezone: "Asia/Kuala_Lumpur",
    now: new Date("2026-10-31T04:00:00Z"),
    ...input,
  });

describe("simulated Orbyte attendance context", () => {
  it("uses the selected property date to show a scheduled shift", () => {
    expect(context()).toMatchObject({
      state: "on_shift",
      attendanceDate: "2026-11-02",
      timezone: "Asia/Kuala_Lumpur",
      source: "Simulated Orbyte Attendance",
    });
  });

  it("distinguishes days off and approved leave", () => {
    expect(context({ dueAt: "2026-11-01T10:00" }).state).toBe("off_shift");
    expect(
      context({
        employeeId: "hotel-employee-1",
        orbyteStaffId: "ORB-HOTEL-EMPLOYEE-1",
      }).state,
    ).toBe("on_leave");
  });

  it("returns unknown for unmapped, missing, and stale attendance data", () => {
    expect(context({ employeeId: "unmapped" }).state).toBe("unknown");
    expect(context({ orbyteStaffId: null }).state).toBe("unknown");
    expect(context({ now: new Date("2026-11-20T04:00:00Z") }).state).toBe(
      "unknown",
    );
    expect(context({ dueAt: "2027-01-02T10:00" }).state).toBe("unknown");
  });

  it("does not depend on the machine timezone for the selected calendar day", () => {
    expect(
      context({
        dueAt: "2026-11-02T23:30:00-08:00",
        timezone: "Asia/Kuala_Lumpur",
      }).attendanceDate,
    ).toBe("2026-11-03");
  });
});
