"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ClientApiError } from "@/lib/api-client";

export function PayDuesButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    try {
      const result = await api<{ checkout_url: string }>("/me/payments/intents", { method: "POST" });
      toast.success("Payment started. Send it to your gym, then wait for the desk to accept.");
      router.push(result.checkout_url);
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Could not start payment");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={start} disabled={pending}>
      {pending ? "Starting…" : "Pay dues"}
    </Button>
  );
}
