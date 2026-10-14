export class ClientApiError extends Error {
  constructor(
    public status: number,
    public type: string,
    message: string,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

type ApiEnvelope<T> = {
  request_id: string;
  data?: T;
  error?: { type: string; message: string };
};

function messageFromResponse(status: number, json: ApiEnvelope<unknown> | null, raw: string) {
  const nested = json?.error as unknown;
  if (nested && typeof nested === "object" && nested !== null && "message" in nested) {
    const text = (nested as { message?: unknown }).message;
    if (typeof text === "string" && text.trim()) return text;
  }
  if (typeof nested === "string" && nested.trim()) return nested;
  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 403) return "You do not have permission for that action.";
  if (status === 404) return "That record was not found. Refresh the page and try again.";
  if (status === 409) return "That email is already registered.";
  if (status === 429) return "Too many attempts. Wait a moment and try again.";
  if (status >= 500) {
    return "The server could not save that. Stop the app, run npm run db:setup, then npm run dev.";
  }
  const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 140);
  if (snippet && !snippet.startsWith("<")) return snippet;
  return `Could not complete that request (${status || "network"}).`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!isForm && !headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers,
      credentials: "include",
      redirect: "follow",
    });
  } catch {
    throw new ClientApiError(0, "network", "Could not reach the server. Is npm run dev still running?");
  }
  const raw = await response.text();
  let json: ApiEnvelope<T> | null = null;
  try {
    json = raw ? (JSON.parse(raw) as ApiEnvelope<T>) : null;
  } catch {
    throw new ClientApiError(response.status, "error", messageFromResponse(response.status, null, raw));
  }
  if (!response.ok) {
    throw new ClientApiError(
      response.status,
      json?.error?.type ?? "error",
      messageFromResponse(response.status, json, raw),
    );
  }
  return json?.data as T;
}
