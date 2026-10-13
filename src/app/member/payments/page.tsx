import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { money, shortDate } from "@/lib/format";
import { PayDuesButton } from "./pay-button";

export default async function MemberPaymentsPage() {
  const session = await requirePageSession("member");
  const payments = await prisma.paymentMember.findMany({
    where: { memberId: session.memberId! },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Membership"
        title="Your payments"
        description="Only your dues. Start a payment and the provider webhook marks it paid — not the thank-you page."
        actions={<PayDuesButton />}
      />
      {payments.length === 0 ? (
        <EmptyState title="No payments yet" description="When you renew, the history will show here." />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{money(Number(payment.amount), payment.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {shortDate(payment.paidAt ?? payment.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
