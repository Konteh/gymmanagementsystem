"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ClientApiError } from "@/lib/api-client";

type Staff = { id: string; email: string; title: string | null };

export function StaffClient({ gymId, staff }: { gymId: string; staff: Staff[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [temp, setTemp] = useState<string | null>(null);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const result = await api<{ temporary_password: string }>(`/gyms/${gymId}/staff`, {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          title: form.get("title") || undefined,
        }),
      });
      setTemp(result.temporary_password);
      toast.success("Staff account created");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Could not add staff");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        {staff.length === 0 ? (
          <EmptyState
            title="No delegated staff yet"
            description="Front desk accounts inherit owner tools for this gym without seeing other tenants."
          />
        ) : (
          staff.map((row) => (
            <div key={row.id} className="rounded-xl border bg-white px-4 py-3">
              <p className="font-medium">{row.email}</p>
              <p className="text-xs text-muted-foreground">{row.title ?? "Staff"}</p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={add} className="space-y-3 rounded-xl border bg-white p-5">
        <h3 className="font-medium">Add staff</h3>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="Front desk" />
        </div>
        {temp ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Temporary password: <span className="font-mono">{temp}</span>
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          Invite staff
        </Button>
      </form>
    </div>
  );
}
