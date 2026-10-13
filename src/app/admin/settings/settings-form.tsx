"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { api, ClientApiError } from "@/lib/api-client";

export function SettingsForm({
  initial,
}: {
  initial: {
    platform_monthly_fee?: number;
    default_currency?: string;
    support_email?: string;
    maintenance_mode?: boolean;
  };
}) {
  const [fee, setFee] = useState(String(initial.platform_monthly_fee ?? 49));
  const [currency, setCurrency] = useState(initial.default_currency ?? "USD");
  const [email, setEmail] = useState(initial.support_email ?? "");
  const [maintenance, setMaintenance] = useState(Boolean(initial.maintenance_mode));
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      await api("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          platform_monthly_fee: Number(fee),
          default_currency: currency,
          support_email: email,
          maintenance_mode: maintenance,
        }),
      });
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4 rounded-xl border bg-white p-5">
      <div className="space-y-1.5">
        <Label htmlFor="fee">Monthly platform fee</Label>
        <Input id="fee" type="number" min={0} value={fee} onChange={(event) => setFee(event.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="currency">Default currency</Label>
        <Input id="currency" value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="support">Support email</Label>
        <Input id="support" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={maintenance} onCheckedChange={(value) => setMaintenance(Boolean(value))} />
        Maintenance mode
      </label>
      <Button onClick={save} disabled={pending}>
        Save settings
      </Button>
    </div>
  );
}
