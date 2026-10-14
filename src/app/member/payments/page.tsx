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
            ? `Current plan ${member.plan.name} is ${money(Number(member.plan.price))} (GMD). Demo payments stay pending until your gym accepts them.`
            : "Only your own dues appear here."
        }
        actions={<PayDuesButton />}
      />
      {payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Pay dues to send a demo payment to your gym. It stays pending until the desk accepts it."
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
                    {payment.status === "pending" ? (
                      <p className="mt-1 text-xs text-muted-foreground">Waiting for your gym to accept</p>
                    ) : null}
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
