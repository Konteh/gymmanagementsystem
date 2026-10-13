import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { publicUser, serializeGym } from "@/lib/serializers";
import { OwnersTable } from "./owners-table";

export default async function AdminOwnersPage() {
  const owners = await prisma.user.findMany({
    where: { role: "gym_owner" },
    include: { ownedGym: true },
    orderBy: { createdAt: "desc" },
  });
  const payload = owners
    .filter((owner) => owner.ownedGym)
    .map((owner) => ({
      ...publicUser(owner),
      gym: serializeGym(owner.ownedGym!),
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="Gym owners"
        description="Approve onboarding, reject incomplete applications, or suspend a tenant. You will not see that gym’s member roster."
      />
      <OwnersTable owners={payload} />
    </div>
  );
}
