import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { serializeGym, serializePlatformPayment } from "@/lib/serializers";
import { SettingsClient } from "./settings-client";

export default async function OwnerSettingsPage() {
  const session = await requirePageSession("gym_owner");
  const [gym, invoices] = await Promise.all([
    prisma.gym.findUnique({ where: { id: session.gymId! } }),
    prisma.paymentPlatform.findMany({
      where: { gymOwnerId: session.userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!gym) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={gym.name}
        title="Gym settings"
        description="Tenant profile and the subscription you pay the platform."
      />
      <SettingsClient gym={serializeGym(gym)} invoices={invoices.map(serializePlatformPayment)} />
    </div>
  );
}
