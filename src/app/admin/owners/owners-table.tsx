"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ClientApiError } from "@/lib/api-client";
import { shortDate } from "@/lib/format";

type Owner = {
  id: string;
  email: string;
  status: string;
  created_at: string;
  gym: {
    id: string;
    name: string;
    status: string;
    phone: string | null;
    address: string | null;
    status_reason: string | null;
  } | null;
};

export function OwnersTable({ owners }: { owners: Owner[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<{ owner: Owner; decision: "approve" | "reject" | "suspend" } | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return owners.filter(
      (owner) =>
        owner.email.includes(q) ||
        owner.gym?.name.toLowerCase().includes(q) ||
        owner.gym?.status.includes(q),
    );
  }, [owners, query]);

  async function confirm() {
    if (!action) return;
    setPending(true);
    try {
      await api(`/admin/owners/${action.owner.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ decision: action.decision, reason }),
      });
      toast.success(`Gym ${action.decision}d`);
      setAction(null);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Update failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search owners, gyms, or status"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gym</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell>
                  <p className="font-medium">{owner.gym?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{owner.gym?.address}</p>
                </TableCell>
                <TableCell>
                  <p>{owner.email}</p>
                  <p className="text-xs text-muted-foreground">{owner.gym?.phone}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={owner.gym?.status ?? owner.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{shortDate(owner.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {owner.gym?.status === "pending" ? (
                      <>
                        <Button size="sm" onClick={() => setAction({ owner, decision: "approve" })}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAction({ owner, decision: "reject" })}>
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {owner.gym?.status === "active" ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setAction({ owner, decision: "suspend" })}
                      >
                        Suspend
                      </Button>
                    ) : null}
                    {owner.gym?.status === "suspended" ? (
                      <Button size="sm" onClick={() => setAction({ owner, decision: "approve" })}>
                        Reinstate
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!action} onOpenChange={() => setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{action?.decision} gym</DialogTitle>
            <DialogDescription>
              {action?.owner.gym?.name} · {action?.owner.email}. This is written to the audit log and the owner is notified in-product by status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={pending}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
