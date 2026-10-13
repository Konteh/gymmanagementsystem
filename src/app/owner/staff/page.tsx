import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { StaffClient } from "./staff-client";

export default async function StaffPage() {
  const session = await requirePageSession("gym_owner");
  const staff = await prisma.gymAdmin.findMany({
    where: { gymId: session.gymId! },
    include: { user: true },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={session.gymName ?? "Gym"}
        title="Staff"
        description="Delegated owner permissions for this gym. Staff cannot create a second tenant."
      />
      <StaffClient
        gymId={session.gymId!}
        staff={staff.map((row) => ({ id: row.id, email: row.user.email, title: row.title }))}
      />
    </div>
  );
}
