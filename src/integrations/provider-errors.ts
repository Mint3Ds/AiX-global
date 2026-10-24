export type ProviderErrorKind =
  | "timeout"
  | "configuration"
  | "authentication"
  | "rate_limit"
  | "connectivity"
  | "availability"
  | "invalid_result";

const messages: Record<ProviderErrorKind, string> = {
  timeout: "OpenAI timed out. Try the analysis again.",
  configuration:
    "OpenAI model or API configuration is invalid. Check server settings.",
  authentication: "OpenAI authentication failed. Check the server API key.",
  rate_limit:
    "OpenAI rate limit or quota reached. Try again after checking usage.",
  connectivity: "Could not connect to OpenAI. Check the connection and retry.",
  availability: "OpenAI is temporarily unavailable. Try again later.",
  invalid_result: "OpenAI returned an invalid structured result. Try again.",
};

export class ProviderError extends Error {
  constructor(
    public readonly kind: ProviderErrorKind,
    public readonly status?: number,
  ) {
    super(messages[kind]);
    this.name = "ProviderError";
  }
}

export function normalizeOpenAIError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const value = error && typeof error === "object" ? error : {};
  const status =
    "status" in value && typeof value.status === "number"
      ? value.status
      : undefined;
  const name =
    "name" in value && typeof value.name === "string" ? value.name : "";
  const code =
    "code" in value && typeof value.code === "string" ? value.code : "";
  if (/Timeout|Abort/i.test(name) || /ETIMEDOUT|ESOCKETTIMEDOUT/.test(code))
    return new ProviderError("timeout", status);
  if (/RateLimit/i.test(name)) return new ProviderError("rate_limit", status);
  if (status === 401 || status === 403)
    return new ProviderError("authentication", status);
  if (status === 429) return new ProviderError("rate_limit", status);
  if (status === 400 || status === 404 || status === 422)
    return new ProviderError("configuration", status);
  if (status === 408 || status === 504)
    return new ProviderError("timeout", status);
  if (status !== undefined && status >= 500)
    return new ProviderError("availability", status);
  if (
    /Connection|Network|Fetch/i.test(name) ||
    /ECONN|ENOTFOUND|EAI_AGAIN/.test(code)
  )
    return new ProviderError("connectivity", status);
  return new ProviderError("invalid_result", status);
}
