import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    public type: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function mapUnknownError(error: unknown): { status: number; type: string; message: string } {
  const err = error as { code?: string; message?: string; meta?: { target?: string[] | string } };
  const message = String(err?.message ?? "");
  const code = err?.code;

  if (code === "P2002") {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : err.meta?.target;
    if (String(target).includes("email")) {
      return { status: 409, type: "conflict", message: "That email is already registered. Use a different one." };
    }
    return { status: 409, type: "conflict", message: "That record already exists." };
  }
  if (
    code === "P2022" ||
    /mustChangePassword/i.test(message) ||
    /column.*does not exist/i.test(message) ||
    /Unknown argument/i.test(message) ||
    /the table `.*` does not exist/i.test(message)
  ) {
    return {
      status: 500,
      type: "schema",
      message: "The local database is out of date. Stop the app, run npm run db:setup, then npm run dev.",
    };
  }
  if (code === "P2003") {
    return { status: 400, type: "invalid_input", message: "That plan or gym no longer exists. Refresh and try again." };
  }
  if (code === "P1003" || code === "P1001" || /Unable to open the database/i.test(message)) {
    return {
      status: 500,
      type: "database",
      message: "Cannot open the local SQLite file. Stop the app, run npm run db:setup, then npm run dev.",
    };
  }
  console.error(error);
  if (message && message.length < 180 && !message.includes("\n") && !message.includes("prisma")) {
    return { status: 500, type: "internal", message };
  }
  return {
    status: 500,
    type: "internal",
    message: "Could not save that. Stop the app, run npm run db:setup, then npm run dev.",
  };
}

export function ok<T>(requestId: string, data: T, status = 200) {
  return NextResponse.json({ request_id: requestId, data }, { status });
}

export function fail(
  requestId: string,
  status: number,
  type: string,
  message: string,
) {
  return NextResponse.json(
    { request_id: requestId, error: { type, message } },
    { status },
  );
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

export function requestIdFrom(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}
