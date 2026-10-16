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
import { daysLeftLabel, money, shortDate } from "@/lib/format";

type Plan = { id: string; name: string; price: number; currency: string; duration_days: number; active: boolean };
type Member = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
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
  const [activating, setActivating] = useState<Member | null>(null);
  const activePlans = plans.filter((plan) => plan.active);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState(activePlans[0]?.id ?? "");

  const rows = useMemo(() => {
    return members.filter((member) => {
      const haystack = `${member.full_name} ${member.phone} ${member.email ?? ""}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesStatus = status === "all" || member.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [members, query, status]);

  function resetForm() {
    setFullName("");
    setPhone("");
    setPlanId(activePlans[0]?.id ?? "");
  }

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = fullName.trim();
    const tel = phone.trim();
    if (!name || !tel) {
      toast.error("Name and phone are required.");
      return;
    }
    setPending(true);
    try {
      const result = await api<{ member: Member }>(`/gyms/${gymId}/members`, {
        method: "POST",
        body: JSON.stringify({
          full_name: name,
          phone: tel,
          plan_id: planId || undefined,
        }),
      });
      toast.success(`${result.member.full_name} is on the roster`);
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Could not add member.");
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

  async function activate() {
    if (!activating) return;
    setPending(true);
    try {
      await api(`/gyms/${gymId}/members/${activating.id}/activate-payment`, { method: "POST" });
      toast.success(`Membership activated for ${activating.full_name}`);
      setActivating(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Could not activate payment");
    } finally {
      setPending(false);
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
            placeholder="Search name or phone"
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
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          Add member
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No members yet"
          description="Add a member from the desk. They do not create an account — they scan the gym QR to check in."
          action={
            <Button
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
            >
              Add member
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Desk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <p className="font-medium">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.phone}</p>
                  </TableCell>
                  <TableCell>
                    <p>{member.plan?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.plan ? money(member.plan.price, member.plan.currency) : null}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={member.status} />
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{member.expires_at ? shortDate(member.expires_at) : "—"}</p>
                    <p className="text-xs text-muted-foreground">{daysLeftLabel(member.expires_at)}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => void checkIn(member.id)}>
                        Check in
                      </Button>
                      <Button size="sm" onClick={() => setActivating(member)}>
                        Activate
                      </Button>
                      {member.status === "active" ? (
                        <Button size="sm" variant="ghost" onClick={() => void setMemberStatus(member.id, "inactive")}>
                          Pause
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => void setMemberStatus(member.id, "active")}>
                          Resume
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

      <Dialog
        open={open}
        disablePointerDismissal={pending}
        onOpenChange={(next) => {
          if (pending && !next) return;
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              They are on the roster immediately. No login. They check in by scanning the gym QR and entering this phone number.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={register} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <input
                id="full_name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                placeholder="+220 …"
                inputMode="tel"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan_id">Plan</Label>
              {activePlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">A default plan will be assigned automatically.</p>
              ) : (
                <select
                  id="plan_id"
                  value={planId}
                  onChange={(event) => setPlanId(event.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {activePlans.map((plan) => (
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
                disabled={pending}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {pending ? "Saving…" : "Add to roster"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activating} onOpenChange={(next) => !next && setActivating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate membership?</DialogTitle>
            <DialogDescription>
              {activating?.full_name} · {activating?.plan ? money(activating.plan.price, activating.plan.currency) : ""}.
              This records a desk payment and extends their plan. Use it for cash, Wave, or any demo payment you have already received.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivating(null)}>
              Cancel
            </Button>
            <Button onClick={() => void activate()} disabled={pending}>
              {pending ? "Activating…" : "Activate payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
