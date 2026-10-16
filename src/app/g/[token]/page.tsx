"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ClientApiError } from "@/lib/api-client";
import { daysLeftLabel, money } from "@/lib/format";

type GymInfo = { name: string; address: string | null; phone: string | null };
type Card = {
  full_name: string;
  phone: string;
  plan_name: string;
  plan_price: number;
  currency: string;
  status: string;
  expires_at: string | null;
  days_left: number | null;
  can_check_in: boolean;
};

export default function GymCheckInPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [gym, setGym] = useState<GymInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [pending, setPending] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    api<GymInfo>(`/public/gyms/${token}`)
      .then(setGym)
      .catch((err) => setError(err instanceof ClientApiError ? err.message : "Check-in is not available."));
  }, [token]);

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setCheckedIn(false);
    try {
      const result = await api<Card>(`/public/gyms/${token}/lookup`, {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setCard(result);
    } catch (err) {
      setCard(null);
      toast.error(err instanceof ClientApiError ? err.message : "Could not find that member");
    } finally {
      setPending(false);
    }
  }

  async function checkIn() {
    setPending(true);
    try {
      const result = await api<{ already_checked_in: boolean; member: Card }>(
        `/public/gyms/${token}/check-in`,
        { method: "POST", body: JSON.stringify({ phone: card?.phone ?? phone }) },
      );
      setCard(result.member);
      setCheckedIn(true);
      toast.success(result.already_checked_in ? "Already checked in" : "You're in. Enjoy the session.");
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Check-in failed");
    } finally {
      setPending(false);
    }
  }

  async function renew() {
    setPending(true);
    try {
      const result = await api<{ message: string; member: Card }>(`/public/gyms/${token}/pay`, {
        method: "POST",
        body: JSON.stringify({ phone: card?.phone ?? phone }),
      });
      setCard(result.member);
      toast.success(result.message);
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not send payment to the desk");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Logo />
        {error ? (
          <p className="mt-8 rounded-xl border bg-white p-4 text-sm text-destructive">{error}</p>
        ) : null}
        {!error && !gym ? (
          <p className="mt-8 text-sm text-muted-foreground">Opening check-in…</p>
        ) : null}
        {gym ? (
          <div className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Check in</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{gym.name}</h1>
            {gym.address ? <p className="mt-1 text-sm text-muted-foreground">{gym.address}</p> : null}

            {!card ? (
              <form onSubmit={lookup} className="mt-6 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Your phone number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="301 1191"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the number the desk saved when they added you. No app and no password.
                  </p>
                </div>
                <Button type="submit" className="h-11 w-full" disabled={pending}>
                  {pending ? "Looking up…" : "Continue"}
                </Button>
              </form>
            ) : (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Hello</p>
                  <p className="text-2xl font-semibold text-ink">{card.full_name}</p>
                </div>
                <div className="rounded-xl bg-[#F3F6FA] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Membership</p>
                      <p className="mt-1 text-lg font-semibold">{card.plan_name}</p>
                    </div>
                    <StatusBadge status={card.status} />
                  </div>
                  <p className="mt-3 text-sm">{daysLeftLabel(card.expires_at)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Renew for {money(card.plan_price, card.currency)}
                  </p>
                </div>
                {checkedIn ? (
                  <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                    Check-in recorded. You can put your phone away.
                  </p>
                ) : (
                  <Button className="h-12 w-full text-base" disabled={pending || !card.can_check_in} onClick={() => void checkIn()}>
                    {pending ? "Checking in…" : card.can_check_in ? "Check in" : "Membership not active"}
                  </Button>
                )}
                <Button variant="outline" className="h-11 w-full" disabled={pending} onClick={() => void renew()}>
                  Pay to renew
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setCard(null);
                    setCheckedIn(false);
                  }}
                >
                  Use a different number
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
