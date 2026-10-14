import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { serializeMemberPayment } from "@/lib/serializers";
import { PaymentsClient } from "./payments-client";

export default async function OwnerPaymentsPage() {
  const session = await requirePageSession("gym_owner");
  const payments = await prisma.paymentMember.findMany({
    where: { gymId: session.gymId! },
    include: { member: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={session.gymName ?? "Gym"}
        title="Member dues"
        description="Members submit demo payments. Accept them here to mark dues paid and extend membership. Platform invoices live under gym settings."
      />
      <PaymentsClient gymId={session.gymId!} payments={payments.map(serializeMemberPayment)} />
    </div>
  );
}
