import { prisma } from "@/lib/db";

export async function writeAudit(input: {
  actorId?: string | null;
  gymId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      gymId: input.gymId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  });
}
