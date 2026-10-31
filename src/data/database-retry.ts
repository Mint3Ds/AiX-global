const TRANSIENT_DATABASE_CODES = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "08P01",
  "53300",
  "57P01",
  "57P02",
  "57P03",
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

/** Read a pg error code through Drizzle's wrapped error/cause chain. */
export function databaseErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  const visited = new Set<unknown>();

  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const candidate = current as {
      code?: unknown;
      cause?: unknown;
      originalError?: unknown;
    };
    if (typeof candidate.code === "string") return candidate.code;
    current = candidate.cause ?? candidate.originalError;
  }

  return undefined;
}

/** Safe schema identifiers only; never return PostgreSQL's detail/row values. */
export function databaseErrorLocation(error: unknown) {
  let current: unknown = error;
  const visited = new Set<unknown>();
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const candidate = current as {
      table?: unknown;
      column?: unknown;
      constraint?: unknown;
      cause?: unknown;
      originalError?: unknown;
    };
    const location = {
      table: typeof candidate.table === "string" ? candidate.table : undefined,
      column: typeof candidate.column === "string" ? candidate.column : undefined,
      constraint:
        typeof candidate.constraint === "string"
          ? candidate.constraint
          : undefined,
    };
    if (location.table || location.column || location.constraint) return location;
    current = candidate.cause ?? candidate.originalError;
  }
  return undefined;
}

export function isTransientDatabaseError(error: unknown): boolean {
  const code = databaseErrorCode(error);
  if (code && TRANSIENT_DATABASE_CODES.has(code)) return true;

  let current: unknown = error;
  const visited = new Set<unknown>();
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const candidate = current as {
      message?: unknown;
      cause?: unknown;
      originalError?: unknown;
    };
    if (
      typeof candidate.message === "string" &&
      /connection terminated unexpectedly|connection terminated due to connection timeout|timeout expired while connecting|could not connect to server/i.test(
        candidate.message,
      )
    )
      return true;
    current = candidate.cause ?? candidate.originalError;
  }

  return false;
}

export function isDatabaseOperationError(error: unknown): boolean {
  const code = databaseErrorCode(error);
  if (code && (/^[0-9A-Z]{5}$/.test(code) || TRANSIENT_DATABASE_CODES.has(code)))
    return true;

  let current: unknown = error;
  const visited = new Set<unknown>();
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const candidate = current as {
      message?: unknown;
      cause?: unknown;
      originalError?: unknown;
    };
    if (
      typeof candidate.message === "string" &&
      /failed query:|database .* does not exist|relation .* does not exist|column .* does not exist/i.test(
        candidate.message,
      )
    )
      return true;
    current = candidate.cause ?? candidate.originalError;
  }

  return false;
}

/** Retry only idempotent reads, and only for recognizable transient failures. */
export async function retryDatabaseRead<T>(
  read: () => Promise<T>,
  options: {
    retries?: number;
    delayMs?: number;
    wait?: (milliseconds: number) => Promise<void>;
  } = {},
): Promise<T> {
  const retries = options.retries ?? 2;
  const delayMs = options.delayMs ?? 150;
  const wait =
    options.wait ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      if (attempt >= retries || !isTransientDatabaseError(error)) throw error;
      await wait(delayMs * 2 ** attempt);
    }
  }
}
