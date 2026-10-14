export class ClientApiError extends Error {
  constructor(
    public status: number,
    public type: string,
    message: string,
  ) {
    super(message);
  }
}

type ApiEnvelope<T> = {
  request_id: string;
  data?: T;
  error?: { type: string; message: string };
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!isForm && !headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const raw = await response.text();
  let json: ApiEnvelope<T> | null = null;
  try {
    json = raw ? (JSON.parse(raw) as ApiEnvelope<T>) : null;
  } catch {
    throw new ClientApiError(
      response.status,
      "error",
      `Could not complete that request (${response.status}).`,
    );
  }
  if (!response.ok) {
    throw new ClientApiError(
      response.status,
      json?.error?.type ?? "error",
      json?.error?.message ?? "Could not complete that request.",
    );
  }
  return json?.data as T;
}
