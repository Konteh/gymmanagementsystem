"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

export function PaymentsClient({ gymId, payments }: { gymId: string; payments: Payment[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Payment | null>(null);
  const [pending, setPending] = useState(false);

  const rows = useMemo(
    () =>
      payments.filter(
        (payment) =>
          !query ||
          payment.member_name?.toLowerCase().includes(query.toLowerCase()) ||
          payment.member_email?.toLowerCase().includes(query.toLowerCase()),
      ),
    [payments, query],
  );

  async function refund() {
    if (!target) return;
    setPending(true);
    try {
      await api(`/gyms/${gymId}/payments/${target.id}/refund`, { method: "POST" });
      toast.success("Refund recorded");
      setTarget(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : "Refund failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search member"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-sm"
      />
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
                  {payment.status === "paid" ? (
                    <Button size="sm" variant="outline" onClick={() => setTarget(payment)}>
                      Refund
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!target} onOpenChange={() => setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund this payment?</DialogTitle>
            <DialogDescription>
              {target?.member_name} · {target ? money(target.amount, target.currency) : ""}. The refund is audited and does not expose other gyms’ data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={refund} disabled={pending}>
              Confirm refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
