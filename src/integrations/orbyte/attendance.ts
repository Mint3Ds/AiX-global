export type AttendanceState = "on_shift" | "off_shift" | "on_leave" | "unknown";

export type AttendanceContext = {
  state: AttendanceState;
  label: string;
  detail: string;
  source: "Simulated Orbyte Attendance";
  orbyteStaffId: string | null;
  attendanceDate: string | null;
  timezone: string;
  sourceTimestamp: string | null;
  sourceIdentifier: string | null;
};

type AttendanceFixture = {
  employeeId: string;
  weekdays: number[];
  shift: string;
  validFrom: string;
  validThrough: string;
  sourceTimestamp: string;
  leave?: { from: string; through: string }[];
};

// Deterministic synthetic schedules for the hackathon workspaces. Replace this
// provider with an Orbyte attendance adapter when a real integration exists.
const fixtures: AttendanceFixture[] = [
  {
    employeeId: "hotel-employee-1",
    weekdays: [1, 2, 3, 4, 5, 6],
    shift: "08:00–16:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
    leave: [{ from: "2026-11-02", through: "2026-11-04" }],
  },
  {
    employeeId: "hotel-employee-2",
    weekdays: [1, 2, 3, 4, 5],
    shift: "09:00–17:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
  },
  {
    employeeId: "hotel-employee-3",
    weekdays: [2, 3, 4, 5, 6],
    shift: "14:00–22:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
  },
  {
    employeeId: "hotel-employee-4",
    weekdays: [0, 1, 2, 3, 4],
    shift: "07:00–15:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
  },
  {
    employeeId: "hotel-employee-5",
    weekdays: [1, 2, 3, 4, 5, 6],
    shift: "10:00–18:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
  },
  {
    employeeId: "hotel-employee-6",
    weekdays: [0, 1, 2, 3, 4],
    shift: "08:00–16:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
  },
  {
    employeeId: "hotel-employee-7",
    weekdays: [1, 2, 3, 4, 5, 6],
    shift: "12:00–20:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
  },
  {
    employeeId: "hotel-employee-8",
    weekdays: [1, 2, 3, 4, 5],
    shift: "08:00–16:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
  },
  {
    employeeId: "restaurant-employee-1",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    shift: "15:00–23:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
  },
  {
    employeeId: "salon-employee-1",
    weekdays: [1, 2, 3, 4, 5, 6],
    shift: "10:00–18:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
  },
  {
    employeeId: "salon-employee-2",
    weekdays: [0, 1, 2, 3, 4, 5],
    shift: "11:00–19:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
  },
  {
    employeeId: "salon-employee-3",
    weekdays: [1, 2, 3, 4, 5, 6],
    shift: "09:00–17:00",
    validFrom: "2026-09-01",
    validThrough: "2026-12-31",
    sourceTimestamp: "2026-10-30T12:00:00+08:00",
  },
];

const labels: Record<AttendanceState, string> = {
  on_shift: "On Shift",
  off_shift: "Off Shift",
  on_leave: "On Leave",
  unknown: "Unknown",
};

function propertyDate(value: string, timezone: string): string | null {
  // A datetime-local value is the date the owner selected in the property
  // workflow; treat its calendar date as the property's local date.
  if (
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    !/(Z|[+-]\d{2}:?\d{2})$/i.test(value)
  )
    return value.slice(0, 10);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  const year = part("year"),
    month = part("month"),
    day = part("day");
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function weekday(date: string, timezone: string): number {
  // `date` has already been projected into the property timezone. Use UTC noon
  // only to derive its calendar weekday without host-timezone/DST drift.
  void timezone;
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function getSimulatedAttendance(input: {
  employeeId: string;
  orbyteStaffId?: string | null;
  dueAt: string;
  timezone: string;
  now?: Date;
}): AttendanceContext {
  const date = propertyDate(input.dueAt, input.timezone);
  const fixture = fixtures.find((item) => item.employeeId === input.employeeId);
  const now = input.now ?? new Date();
  const sourceTime = fixture ? new Date(fixture.sourceTimestamp) : null;
  const stale =
    !sourceTime || now.getTime() - sourceTime.getTime() > 14 * 86_400_000;
  if (
    !date ||
    !fixture ||
    !input.orbyteStaffId ||
    stale ||
    date < fixture.validFrom ||
    date > fixture.validThrough
  ) {
    return {
      state: "unknown",
      label: labels.unknown,
      detail: "Attendance data unavailable for this date",
      source: "Simulated Orbyte Attendance",
      orbyteStaffId: input.orbyteStaffId ?? null,
      attendanceDate: date,
      timezone: input.timezone,
      sourceTimestamp: fixture?.sourceTimestamp ?? null,
      sourceIdentifier: fixture ? "simulated-attendance-fixture-v1" : null,
    };
  }
  const leave = fixture.leave?.some(
    (period) => date >= period.from && date <= period.through,
  );
  const state: AttendanceState = leave
    ? "on_leave"
    : fixture.weekdays.includes(weekday(date, input.timezone))
      ? "on_shift"
      : "off_shift";
  return {
    state,
    label: labels[state],
    detail: leave
      ? `Approved leave · ${date}`
      : state === "on_shift"
        ? `${fixture.shift} · ${date}`
        : `Not scheduled · ${date}`,
    source: "Simulated Orbyte Attendance",
    orbyteStaffId: input.orbyteStaffId,
    attendanceDate: date,
    timezone: input.timezone,
    sourceTimestamp: fixture.sourceTimestamp,
    sourceIdentifier: "simulated-attendance-fixture-v1",
  };
}
