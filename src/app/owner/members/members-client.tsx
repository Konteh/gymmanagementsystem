"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ClientApiError } from "@/lib/api-client";
import { money, shortDate } from "@/lib/format";

type Plan = { id: string; name: string; price: number; currency: string; duration_days: number; active: boolean };
type Member = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  status: string;
  joined_at: string;
  expires_at: string | null;
  plan?: Plan;
};

export function MembersClient({
  gymId,
  members,
  plans,
}: {
  gymId: string;
  members: Member[];
  plans: Plan[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const rows = useMemo(() => {
    return members.filter((member) => {
      const matchesQuery =
        !query ||
        member.full_name.toLowerCase().includes(query.toLowerCase()) ||
        member.email.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "all" || member.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [members, query, status]);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!gymId) {
      toast.error("This gym is not ready yet. Refresh and try again.");
      return;
    }
    const form = event.currentTarget;
    const fullName = (form.elements.namedItem("full_name") as HTMLInputElement | null)?.value?.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement | null)?.value?.trim();
    const phone = (form.elements.namedItem("phone") as HTMLInputElement | null)?.value?.trim();
    const planId = (form.elements.namedItem("plan_id") as HTMLSelectElement | null)?.value;
    if (!fullName || !email) {
      toast.error("Name and email are required.");
      return;
    }
    setPending(true);
    try {
      const result = await api<{ member: Member; temporary_password: string | null }>(
        `/gyms/${gymId}/members`,
        {
          method: "POST",
          body: JSON.stringify({
            full_name: fullName,
            email,
            phone: phone || undefined,
            plan_id: planId || undefined,
          }),
        },
      );
      setTempPassword(result.temporary_password);
      toast.success(`${result.member.full_name} is on the roster`);
      if (!result.temporary_password) setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Could not register member");
    } finally {
      setPending(false);
    }
  }

  async function checkIn(memberId: string) {
    try {
      await api(`/gyms/${gymId}/check-ins`, {
        method: "POST",
        body: JSON.stringify({ member_id: memberId }),
      });
      toast.success("Checked in");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Check-in failed");
    }
  }

  async function setMemberStatus(memberId: string, next: string) {
    try {
      await api(`/gyms/${gymId}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      toast.success("Member updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Update failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Search name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={status} onValueChange={(value) => setStatus(value ?? "all")}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setTempPassword(null); setOpen(true); }}>Register member</Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No members match"
          description="Register someone from the desk. Self-serve member signup is intentionally not offered."
          action={<Button onClick={() => setOpen(true)}>Quick register</Button>}
        />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Desk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {member.photo_url ? (
                        <img src={member.photo_url} alt="" className="size-8 rounded-full bg-muted" />
                      ) : (
                        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {member.full_name.slice(0, 1)}
                        </span>
                      )}
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p>{member.plan?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.plan ? money(member.plan.price, member.plan.currency) : null}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={member.status} />
                    {member.expires_at ? (
                      <p className="mt-1 text-xs text-muted-foreground">Until {shortDate(member.expires_at)}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{shortDate(member.joined_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => checkIn(member.id)}>
                        Check in
                      </Button>
                      {member.status === "active" ? (
                        <Button size="sm" variant="ghost" onClick={() => setMemberStatus(member.id, "inactive")}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setMemberStatus(member.id, "active")}>
                          Activate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick registration</DialogTitle>
            <DialogDescription>
              Name, contact, plan. Photo is optional. A one-time password is created so they can sign in and choose their own.
            </DialogDescription>
          </DialogHeader>
          {tempPassword ? (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              One-time password: <span className="font-mono font-medium">{tempPassword}</span>
              <p className="mt-1 text-xs">
                Share it once. The member must replace it with their own password on first sign-in. It will not be shown here again.
              </p>
            </div>
          ) : (
            <form onSubmit={register} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <input
                  id="full_name"
                  name="full_name"
                  required
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <input
                    id="phone"
                    name="phone"
                    placeholder="+220 …"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan_id">Plan</Label>
                {plans.filter((plan) => plan.active).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No plans yet. Add one under Plans, then register the member.
                  </p>
                ) : (
                  <select
                    id="plan_id"
                    name="plan_id"
                    required
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    {plans.filter((plan) => plan.active).map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} · {money(plan.price, plan.currency)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <DialogFooter>
                <button
                  type="submit"
                  data-testid="register-member-submit"
                  disabled={pending}
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Register"}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
