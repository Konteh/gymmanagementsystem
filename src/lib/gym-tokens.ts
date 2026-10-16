import { randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { IDS } from "@/lib/constants";

const DEMO_CHECK_IN: Record<string, string> = {
  [IDS.ironforgeGym]: IDS.bakauCheckIn,
  [IDS.peakGym]: IDS.brikamaCheckIn,
  [IDS.harborGym]: IDS.harborCheckIn,
  [IDS.northsideGym]: IDS.laminCheckIn,
};

export async function fillMissingCheckInTokens(client: PrismaClient) {
  try {
    const rows = await client.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM Gym WHERE checkInToken IS NULL OR checkInToken = ''`,
    );
    for (const row of rows) {
      const token = DEMO_CHECK_IN[row.id] ?? randomBytes(16).toString("hex");
      await client.$executeRaw`UPDATE Gym SET "checkInToken" = ${token} WHERE id = ${row.id}`;
    }
  } catch {
    // Gym or checkInToken may not exist until db:setup has run.
  }
}
