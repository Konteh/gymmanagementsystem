"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ClientApiError } from "@/lib/api-client";
import { money } from "@/lib/format";

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  active: boolean;
};

export function PlansClient({ gymId, plans }: { gymId: string; plans: Plan[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await api(`/gyms/${gymId}/plans`, {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          price: Number(form.get("price")),
          duration_days: Number(form.get("duration_days")),
        }),
      });
      toast.success("Plan added");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Could not add plan");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="grid gap-3 lg:col-span-2 sm:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{money(plan.price, plan.currency)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{plan.duration_days} day access</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <form onSubmit={create} className="space-y-3 rounded-xl border bg-white p-5">
        <h3 className="font-medium">New plan</h3>
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price</Label>
          <Input id="price" name="price" type="number" min={1} step="0.01" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration_days">Duration (days)</Label>
          <Input id="duration_days" name="duration_days" type="number" min={1} required />
        </div>
        <Button type="submit" disabled={pending}>
          Add plan
        </Button>
      </form>
    </div>
  );
}
