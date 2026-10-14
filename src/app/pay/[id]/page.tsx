"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { api, ClientApiError } from "@/lib/api-client";
import { money } from "@/lib/format";

type Payload = {
  kind: "member" | "platform";
  payment: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    invoice?: string;
    member_name?: string;
  };
};

export default function PayPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const kind = (search.get("kind") as "member" | "platform") ?? "member";
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<Payload>(`/payments/${params.id}?kind=${kind}`)
      .then(setData)
      .catch((err) => setError(err instanceof ClientApiError ? err.message : "Payment not found"));
  }, [params.id, kind]);

  async function complete(outcome: "succeeded" | "failed") {
    setPending(true);
    try {
      if (kind === "member" && outcome === "succeeded") {
        toast.success("Sent to your gym. The desk will accept this demo payment.");
        window.location.assign("/member/payments");
        return;
      }
      await api(`/payments/${params.id}/demo-complete`, {
        method: "POST",
        body: JSON.stringify({ kind, outcome }),
      });
      toast.success(outcome === "succeeded" ? "Payment captured" : "Payment marked failed");
      window.location.assign(kind === "platform" ? "/owner/settings" : "/member/payments");
    } catch (err) {
      setPending(false);
      toast.error(err instanceof ClientApiError ? err.message : "Checkout failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F6FA] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold text-ink">Secure checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {kind === "member"
            ? "Demo dues. Send this to your gym — the owner accepts it from Dues. There is no live card charge."
            : "Demo provider. In production this screen is hosted by the payment processor; the webhook is still the source of truth."}
        </p>
        {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
        {!data && !error ? <p className="mt-6 text-sm text-muted-foreground">Loading payment…</p> : null}
        {data ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-[#F3F6FA] p-4">
              <p className="text-xs text-muted-foreground">
                {data.kind === "platform" ? data.payment.invoice : data.payment.member_name ?? "Membership dues"}
              </p>
              <p className="mt-1 text-3xl font-semibold text-ink">
                {money(data.payment.amount, data.payment.currency)}
              </p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">{data.payment.status}</p>
            </div>
            {data.payment.status === "pending" ? (
              <div className="flex gap-2">
                <Button className="flex-1" disabled={pending} onClick={() => complete("succeeded")}>
                  {kind === "member" ? "Send to gym" : "Pay now"}
                </Button>
                <Button variant="outline" className="flex-1" disabled={pending} onClick={() => complete("failed")}>
                  Simulate failure
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This payment is already {data.payment.status}.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
