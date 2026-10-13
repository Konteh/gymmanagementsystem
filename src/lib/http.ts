import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    public type: string,
    message: string,
  ) {
    super(message);
  }
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
