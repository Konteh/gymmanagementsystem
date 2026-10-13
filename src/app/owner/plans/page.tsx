import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { serializePlan } from "@/lib/serializers";
import { PlansClient } from "./plans-client";

export default async function PlansPage() {
  const session = await requirePageSession("gym_owner");
  const plans = await prisma.membershipPlan.findMany({
    where: { gymId: session.gymId! },
    orderBy: { price: "asc" },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={session.gymName ?? "Gym"}
        title="Membership plans"
        description="Prices and durations used during quick registration and member dues."
      />
      <PlansClient gymId={session.gymId!} plans={plans.map(serializePlan)} />
    </div>
  );
}
