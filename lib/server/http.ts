import "server-only";

/**
 * Café Circle AI — API response helpers.
 *
 * Success responses are the raw payload. Errors are always shaped
 * `{ error: { message, details? } }` so the client has one thing to read.
 * Every response is `no-store`: it reflects live database state.
 */

export function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", "no-store");
  return Response.json(data, { ...init, headers });
}

function errorResponse(status: number, message: string, details?: unknown): Response {
  const error = details === undefined ? { message } : { message, details };
  return json({ error }, { status });
}

export function badRequest(message: string, details?: unknown): Response {
  return errorResponse(400, message, details);
}

export function notFound(message = "Not found"): Response {
  return errorResponse(404, message);
}

export function serverError(
  message = "Something went wrong while talking to the database.",
): Response {
  // Deliberately generic: never surface stack traces, SQL text or connection
  // strings to the client. Call logServerError() to record the real cause.
  return errorResponse(500, message);
}

/**
 * Map a well-known database failure to a message that tells the developer what
 * to fix. These are setup problems, not secrets: the connection string itself is
 * never included, and `logServerError` still records the real cause.
 */
function setupGuidance(error: unknown): { status: number; message: string } | null {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code !== "string") return null;

  switch (code) {
    case "SUPABASE_NOT_CONFIGURED":
      return {
        status: 503,
        message:
          "Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env. The server uses Supabase's Data API, not DATABASE_URL.",
      };
    case "42P01": // undefined_table
    case "PGRST205": // table missing from API schema cache
      return {
        status: 503,
        message:
          "The app tables are missing from the Supabase Data API. Apply the SQL migrations in Supabase's SQL Editor, then run npm run db:seed.",
      };
    case "42703": // undefined_column
    case "PGRST204":
    case "PGRST202": // missing RPC
      return {
        status: 503,
        message: "The Supabase schema is out of date. Apply the supabase_api migration in Supabase's SQL Editor.",
      };
    case "28P01": // invalid_password
    case "28000": // invalid_authorization_specification
    case "3D000": // invalid_catalog_name
    case "PGRST301":
    case "PGRST302":
      return {
        status: 503,
        message:
          "Supabase rejected the API credentials. Check SUPABASE_URL and the rotated SUPABASE_SECRET_KEY in .env.",
      };
    case "42501":
      return {
        status: 503,
        message: "Supabase denied access. Apply the server-role grants in the supabase_api migration; do not disable RLS.",
      };
    default:
      return null;
  }
}

/**
 * Response for a database-backed handler that threw. Setup problems get
 * actionable guidance; everything else gets the generic server error.
 */
export function databaseError(error: unknown, scope: string): Response {
  logServerError(scope, error);
  const guidance = setupGuidance(error);
  if (guidance) return errorResponse(guidance.status, guidance.message);
  return serverError();
}

/** Matches both `postgres://` and `postgresql://` URLs. */
const CONNECTION_STRING_PATTERN = /postgres(?:ql)?:\/\/\S+/gi;

function redactConnectionStrings(text: string): string {
  let safe = text.replace(CONNECTION_STRING_PATTERN, "[redacted connection string]")
    .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, "[redacted API key]");
  for (const key of [process.env.SUPABASE_SECRET_KEY, process.env.GEMINI_API_KEY]) {
    if (key) safe = safe.split(key).join("[redacted secret]");
  }
  return safe;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}

/**
 * Log the real error server-side so operators can debug, with any connection
 * string redacted. The client only ever sees the safe message from serverError.
 */
export function logServerError(scope: string, error: unknown): void {
  console.error(`[${scope}] ${redactConnectionStrings(errorText(error))}`);
}
