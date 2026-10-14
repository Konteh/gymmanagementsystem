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

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  member_name?: string;
  member_email?: string;
};

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  failed: 1,
  paid: 2,
  refunded: 3,
};

export function PaymentsClient({ gymId, payments }: { gymId: string; payments: Payment[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [accepting, setAccepting] = useState<Payment | null>(null);
  const [refunding, setRefunding] = useState<Payment | null>(null);
  const [pending, setPending] = useState(false);

  const rows = useMemo(() => {
    return payments
      .filter(
        (payment) =>
          !query ||
          payment.member_name?.toLowerCase().includes(query.toLowerCase()) ||
          payment.member_email?.toLowerCase().includes(query.toLowerCase()),
      )
      .sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9));
  }, [payments, query]);

  const waiting = payments.filter((payment) => payment.status === "pending" || payment.status === "failed").length;

  async function accept() {
    if (!accepting) return;
    setPending(true);
    try {
      await api(`/gyms/${gymId}/payments/${accepting.id}/accept`, { method: "POST" });
      toast.success(`Accepted ${accepting.member_name ?? "member"}'s demo payment`);
      setAccepting(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Could not accept payment");
    } finally {
      setPending(false);
    }
  }

  async function refund() {
    if (!refunding) return;
    setPending(true);
    try {
      await api(`/gyms/${gymId}/payments/${refunding.id}/refund`, { method: "POST" });
      toast.success("Refund recorded");
      setRefunding(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Refund failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {waiting > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {waiting} demo payment{waiting === 1 ? "" : "s"} waiting for the desk to accept.
          Confirm cash or Wave at the counter, then accept.
        </div>
      ) : null}
      <Input
        placeholder="Search member"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-sm"
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No member dues yet"
          description="When a member pays, the payment stays pending here until you accept it."
        />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <p className="font-medium">{payment.member_name}</p>
                    <p className="text-xs text-muted-foreground">{payment.member_email}</p>
                  </TableCell>
                  <TableCell>{money(payment.amount, payment.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {shortDate(payment.paid_at ?? payment.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === "pending" || payment.status === "failed" ? (
                      <Button size="sm" onClick={() => setAccepting(payment)}>
                        Accept
                      </Button>
                    ) : null}
                    {payment.status === "paid" ? (
                      <Button size="sm" variant="outline" onClick={() => setRefunding(payment)}>
                        Refund
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!accepting} onOpenChange={(open) => !open && setAccepting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept this demo payment?</DialogTitle>
            <DialogDescription>
              {accepting?.member_name} · {accepting ? money(accepting.amount, accepting.currency) : ""}.
              This marks the dues paid and extends their membership. There is no live card processor in this demo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccepting(null)}>
              Cancel
            </Button>
            <Button onClick={() => void accept()} disabled={pending}>
              {pending ? "Accepting…" : "Accept payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refunding} onOpenChange={(open) => !open && setRefunding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund this payment?</DialogTitle>
            <DialogDescription>
              {refunding?.member_name} · {refunding ? money(refunding.amount, refunding.currency) : ""}. The refund is audited and does not expose other gyms’ data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefunding(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void refund()} disabled={pending}>
              Confirm refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
