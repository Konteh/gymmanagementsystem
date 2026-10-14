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
  const member = await prisma.member.findUnique({
    where: { id: session.memberId! },
    include: { plan: true },
  });
  const payments = await prisma.paymentMember.findMany({
    where: { memberId: session.memberId! },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your dues"
        title="Payments"
        description={
          member
            ? `Current plan ${member.plan.name} is ${money(Number(member.plan.price))} (GMD). Only your own payments appear here.`
            : "Only your own dues appear here."
        }
        actions={<PayDuesButton />}
      />
      {payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="When you pay or renew, the amount in dalasi and the status will show here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount (GMD)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{money(Number(payment.amount))}</TableCell>
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
