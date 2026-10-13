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
import { money, shortDate } from "@/lib/format";

export default async function AdminPaymentsPage() {
  const payments = await prisma.paymentPlatform.findMany({
    include: { gymOwner: { include: { ownedGym: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="Platform payments"
        description="Owner-to-platform subscription invoices only. Member dues stay inside each gym."
      />
      {payments.length === 0 ? (
        <EmptyState title="No invoices yet" description="Platform invoices appear when gyms are onboarded." />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Gym</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.invoice}</TableCell>
                  <TableCell>{payment.gymOwner.ownedGym?.name ?? "—"}</TableCell>
                  <TableCell>{payment.gymOwner.email}</TableCell>
                  <TableCell>{money(Number(payment.amount), payment.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{shortDate(payment.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
