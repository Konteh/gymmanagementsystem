"use client";

import { toast } from "sonner";
import { api, ClientApiError } from "@/lib/api-client";
import { DEMO_PASSWORD } from "@/lib/demo";

export async function signInAndGo(email: string, next: string) {
  const result = await api<{ next: string; must_change_password?: boolean }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  });
  const requested = next.startsWith("/") && !next.startsWith("//") ? next : result.next;
  const destination = result.must_change_password ? "/set-password" : requested || result.next || "/";
  window.location.assign(destination);
}

export function demoSignInError(error: unknown) {
  return error instanceof ClientApiError ? error.message : "Could not open the demo account";
}

export { toast };
