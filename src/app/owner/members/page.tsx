import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { serializeMember, serializePlan } from "@/lib/serializers";
import { MembersClient } from "./members-client";

export default async function MembersPage() {
  const session = await requirePageSession("gym_owner");
  const [members, plans] = await Promise.all([
    prisma.member.findMany({
      where: { gymId: session.gymId! },
      include: { plan: true },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.membershipPlan.findMany({
      where: { gymId: session.gymId! },
      orderBy: { price: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={session.gymName ?? "Gym"}
        title="Members"
        description="Quick registration from the desk. Members cannot sign themselves up."
      />
      <MembersClient
        gymId={session.gymId!}
        members={members.map(serializeMember)}
        plans={plans.map(serializePlan)}
      />
    </div>
  );
}
