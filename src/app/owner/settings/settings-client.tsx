"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ClientApiError } from "@/lib/api-client";
import { money, shortDate } from "@/lib/format";

type Gym = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
};

type Invoice = {
  id: string;
  invoice: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export function SettingsClient({ gym, invoices }: { gym: Gym; invoices: Invoice[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await api(`/gyms/${gym.id}/settings`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email"),
          address: form.get("address"),
        }),
      });
      toast.success("Gym profile updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function pay(id: string) {
    try {
      const result = await api<{ checkout_url: string }>(`/platform/invoices/${id}/pay`, {
        method: "POST",
      });
      router.push(result.checkout_url);
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Could not start payment");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-3 rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Gym profile</h3>
          <StatusBadge status={gym.status} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={gym.name} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={gym.phone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={gym.email ?? ""} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" defaultValue={gym.address ?? ""} />
        </div>
        <Button type="submit" disabled={pending}>
          Save profile
        </Button>
      </form>
      <div className="space-y-3 rounded-xl border bg-white p-5">
        <h3 className="font-medium">Platform subscription</h3>
        <p className="text-sm text-muted-foreground">
          These invoices are Gym Owner → Platform. Super Admin can see them. Your members cannot.
        </p>
        {invoices.map((invoice) => (
          <div key={invoice.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
            <div>
              <p className="text-sm font-medium">{invoice.invoice}</p>
              <p className="text-xs text-muted-foreground">
                {money(invoice.amount, invoice.currency)} · {shortDate(invoice.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={invoice.status} />
              {invoice.status === "pending" || invoice.status === "failed" ? (
                <Button size="sm" onClick={() => pay(invoice.id)}>
                  Pay
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
