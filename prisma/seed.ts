import {
  PrismaClient,
  type GymStatus,
  type Member,
  type MemberStatus,
  type PaymentStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  DEMO_PASSWORD,
  IDS,
  PLAN_PRICES,
  PLATFORM_FEE_DEFAULT,
  PRODUCT_SHAPE,
} from "../src/lib/constants";
import { normalizePhone } from "../src/lib/phone";

const DEMO_CHECK_IN: Record<string, string> = {
  [IDS.ironforgeGym]: IDS.bakauCheckIn,
  [IDS.peakGym]: IDS.brikamaCheckIn,
  [IDS.harborGym]: IDS.harborCheckIn,
  [IDS.northsideGym]: IDS.laminCheckIn,
};

const prisma = new PrismaClient();

function daysAgo(days: number, hours = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, Math.floor(Math.random() * 50), 0, 0);
  return d;
}

async function resetLocalData() {
  await prisma.webhookEvent.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.paymentMember.deleteMany();
  await prisma.paymentPlatform.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.gymAdmin.deleteMany();
  await prisma.member.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.gym.deleteMany();
  await prisma.user.deleteMany();
}

async function ensureCheckInTokens() {
  const gyms = await prisma.gym.findMany({
    where: { OR: [{ checkInToken: null }, { checkInToken: "" }] },
  });
  for (const gym of gyms) {
    await prisma.gym.update({
      where: { id: gym.id },
      data: { checkInToken: DEMO_CHECK_IN[gym.id] ?? randomBytes(16).toString("hex") },
    });
  }
  if (gyms.length) {
    console.log(`Filled check-in tokens for ${gyms.length} gym(s).`);
  }
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { id: IDS.superAdmin } });
  const shape = await prisma.systemSetting.findUnique({ where: { key: "product_shape" } }).catch(() => null);
  const currentShape = shape ? (JSON.parse(shape.value) as string) : null;

  if (existing && currentShape === PRODUCT_SHAPE) {
    await ensureCheckInTokens();
    console.log("Desk QR seed already applied.");
    return;
  }

  if (existing) {
    console.log("Replacing previous seed with desk QR (no member login) data.");
    await resetLocalData();
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.user.create({
    data: {
      id: IDS.superAdmin,
      email: "iris.p@example.org",
      passwordHash,
      role: "super_admin",
      status: "active",
    },
  });

  const owner = await prisma.user.create({
    data: {
      id: IDS.ironforgeOwner,
      email: "maria.s@example.com",
      passwordHash,
      role: "gym_owner",
      status: "active",
    },
  });

  const gym = await prisma.gym.create({
    data: {
      id: IDS.ironforgeGym,
      ownerId: owner.id,
      name: "Bakau Powerhouse",
      phone: "+220 449 2180",
      email: "samuel.w@example.com",
      address: "Bertil Harding Highway, Bakau, Kanifing Municipality",
      status: "active",
      checkInToken: IDS.bakauCheckIn,
      settingsJson: JSON.stringify({
        currency: DEFAULT_CURRENCY,
        timezone: DEFAULT_TIMEZONE,
        checkin_notes: "Members scan the printed QR at the door.",
      }),
      createdAt: daysAgo(210),
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      id: IDS.staffKai,
      email: "tom.h@example.org",
      passwordHash,
      role: "gym_owner",
      status: "active",
    },
  });
  await prisma.gymAdmin.create({
    data: {
      gymId: gym.id,
      userId: staffUser.id,
      title: "Front desk lead",
      permissions: JSON.stringify(["members", "payments", "checkins"]),
    },
  });

  const dayPass = await prisma.membershipPlan.create({
    data: { gymId: gym.id, name: "Day Pass", price: PLAN_PRICES.dayPass, currency: DEFAULT_CURRENCY, durationDays: 1, active: true },
  });
  const monthly = await prisma.membershipPlan.create({
    data: { gymId: gym.id, name: "Strength Monthly", price: PLAN_PRICES.monthly, currency: DEFAULT_CURRENCY, durationDays: 30, active: true },
  });
  const quarterly = await prisma.membershipPlan.create({
    data: { gymId: gym.id, name: "Unlimited Quarterly", price: PLAN_PRICES.quarterly, currency: DEFAULT_CURRENCY, durationDays: 90, active: true },
  });
  await prisma.membershipPlan.create({
    data: { gymId: gym.id, name: "Annual Iron", price: PLAN_PRICES.annual, currency: DEFAULT_CURRENCY, durationDays: 365, active: true },
  });

  const roster: Array<{
    id?: string;
    name: string;
    email?: string;
    phone: string;
    planId: string;
    status: MemberStatus;
    joined: number;
    expiresIn: number | null;
  }> = [
    { id: IDS.jordan, name: "Lamin Jallow", email: "victor.l@example.com", phone: "+220 301 1191", planId: monthly.id, status: "active", joined: 86, expiresIn: 18 },
    { name: "Fatou Ceesay", phone: "+220 333 2214", planId: quarterly.id, status: "active", joined: 140, expiresIn: 52 },
    { name: "Ebrima Touray", phone: "+220 705 1840", planId: monthly.id, status: "active", joined: 44, expiresIn: 12 },
    { name: "Awa Njie", phone: "+220 366 9012", planId: monthly.id, status: "expired", joined: 120, expiresIn: -6 },
    { name: "Omar Sanyang", phone: "+220 990 4418", planId: quarterly.id, status: "inactive", joined: 200, expiresIn: 20 },
    { name: "Isatou Camara", phone: "+220 318 7721", planId: monthly.id, status: "active", joined: 21, expiresIn: 9 },
    { name: "Modou Bah", phone: "+220 722 1560", planId: dayPass.id, status: "active", joined: 1, expiresIn: 0 },
    { name: "Mariama Darboe", phone: "+220 345 8803", planId: monthly.id, status: "active", joined: 63, expiresIn: 4 },
    { name: "Yankuba Colley", phone: "+220 611 0944", planId: quarterly.id, status: "active", joined: 70, expiresIn: 40 },
    { name: "Adama Jaiteh", phone: "+220 377 2109", planId: monthly.id, status: "active", joined: 15, expiresIn: 15 },
    { name: "Kaddy Manneh", phone: "+220 509 6631", planId: monthly.id, status: "expired", joined: 95, expiresIn: -11 },
    { name: "Pa Saine", phone: "+220 220 4488", planId: monthly.id, status: "active", joined: 8, expiresIn: 22 },
    { name: "Binta Jammeh", phone: "+220 688 1307", planId: quarterly.id, status: "active", joined: 33, expiresIn: 57 },
    { name: "Ousman Ceesay", phone: "+220 441 7755", planId: monthly.id, status: "inactive", joined: 160, expiresIn: 2 },
  ];

  const members: Member[] = [];
  for (const row of roster) {
    const member = await prisma.member.create({
      data: {
        ...(row.id ? { id: row.id } : {}),
        gymId: gym.id,
        planId: row.planId,
        fullName: row.name,
        phone: normalizePhone(row.phone),
        email: row.email ?? null,
        status: row.status,
        joinedAt: daysAgo(row.joined),
        expiresAt: row.expiresIn === null ? null : daysAgo(-row.expiresIn),
        updatedAt: row.status === "expired" ? daysAgo(Math.abs(row.expiresIn ?? 6)) : row.status === "inactive" ? daysAgo(12) : new Date(),
      },
    });
    members.push(member);
  }

  const planAmount = (planId: string) => {
    if (planId === quarterly.id) return PLAN_PRICES.quarterly;
    if (planId === dayPass.id) return PLAN_PRICES.dayPass;
    return PLAN_PRICES.monthly;
  };

  for (const member of members) {
    const paidCount = member.status === "active" ? 3 : 2;
    for (let i = paidCount; i >= 1; i--) {
      const status: PaymentStatus = i === 1 && member.status === "expired" ? "failed" : "paid";
      await prisma.paymentMember.create({
        data: {
          memberId: member.id,
          gymId: gym.id,
          amount: planAmount(member.planId),
          currency: DEFAULT_CURRENCY,
          status,
          paidAt: status === "paid" ? daysAgo(i * 28, 14) : null,
          createdAt: daysAgo(i * 28, 13),
          providerRef: status === "paid" ? `pay_seed_${member.id.slice(0, 8)}_${i}` : null,
        },
      });
    }
  }

  const activeMembers = members.filter((m) => m.status === "active");
  for (let day = 0; day < 18; day++) {
    const sample = activeMembers.slice(0, 4 + (day % 5));
    for (const member of sample) {
      await prisma.attendance.create({
        data: {
          memberId: member.id,
          gymId: gym.id,
          checkedInAt: daysAgo(day, 6 + (day % 8)),
          source: day % 4 === 0 ? "qr" : "front_desk",
        },
      });
    }
  }

  await prisma.paymentPlatform.createMany({
    data: [
      { gymOwnerId: owner.id, amount: PLATFORM_FEE_DEFAULT, currency: DEFAULT_CURRENCY, status: "paid", invoice: "INV-2026-0032", paidAt: daysAgo(70), createdAt: daysAgo(72), providerRef: "pay_plat_32" },
      { gymOwnerId: owner.id, amount: PLATFORM_FEE_DEFAULT, currency: DEFAULT_CURRENCY, status: "paid", invoice: "INV-2026-0041", paidAt: daysAgo(40), createdAt: daysAgo(42), providerRef: "pay_plat_41" },
      { gymOwnerId: owner.id, amount: PLATFORM_FEE_DEFAULT, currency: DEFAULT_CURRENCY, status: "pending", invoice: "INV-2026-0050", createdAt: daysAgo(8) },
    ],
  });

  async function otherGym(
    ownerId: string,
    gymId: string,
    email: string,
    name: string,
    phone: string,
    address: string,
    status: GymStatus,
    reason: string | null,
    checkInToken: string,
    userStatus: "active" | "suspended" = "active",
  ) {
    await prisma.user.create({
      data: { id: ownerId, email, passwordHash, role: "gym_owner", status: userStatus },
    });
    await prisma.gym.create({
      data: {
        id: gymId,
        ownerId,
        name,
        email,
        phone,
        address,
        status,
        statusReason: reason,
        checkInToken,
        settingsJson: JSON.stringify({
          currency: DEFAULT_CURRENCY,
          timezone: DEFAULT_TIMEZONE,
        }),
      },
    });
  }

  await otherGym(
    IDS.peakOwner,
    IDS.peakGym,
    "uma.s@example.org",
    "Brikama Motion Studio",
    "+220 448 3301",
    "Kombo Central, Brikama",
    "pending",
    null,
    IDS.brikamaCheckIn,
  );
  await otherGym(
    IDS.harborOwner,
    IDS.harborGym,
    "cole@harborstrength.example",
    "Banjul Harbor Gym",
    "+220 422 6610",
    "Independence Drive, Banjul",
    "suspended",
    "Past-due platform invoices and unresolved billing dispute.",
    IDS.harborCheckIn,
    "suspended",
  );
  await otherGym(
    IDS.northsideOwner,
    IDS.northsideGym,
    "tina.r@example.net",
    "Lamin Boxing Club",
    "+220 437 2294",
    "Lamin Village, West Coast Region",
    "rejected",
    "Could not verify facility insurance documents.",
    IDS.laminCheckIn,
  );

  await prisma.paymentPlatform.createMany({
    data: [
      { gymOwnerId: IDS.peakOwner, amount: PLATFORM_FEE_DEFAULT, currency: DEFAULT_CURRENCY, status: "pending", invoice: "INV-2026-0051" },
      { gymOwnerId: IDS.harborOwner, amount: PLATFORM_FEE_DEFAULT, currency: DEFAULT_CURRENCY, status: "failed", invoice: "INV-2026-0044", createdAt: daysAgo(20) },
    ],
  });

  await prisma.systemSetting.createMany({
    data: [
      { key: "platform_monthly_fee", value: JSON.stringify(PLATFORM_FEE_DEFAULT), updatedBy: IDS.superAdmin },
      { key: "default_currency", value: JSON.stringify(DEFAULT_CURRENCY), updatedBy: IDS.superAdmin },
      { key: "support_email", value: JSON.stringify("quinn.m@example.net"), updatedBy: IDS.superAdmin },
      { key: "maintenance_mode", value: JSON.stringify(false), updatedBy: IDS.superAdmin },
      { key: "product_shape", value: JSON.stringify(PRODUCT_SHAPE), updatedBy: IDS.superAdmin },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { actorId: IDS.superAdmin, gymId: gym.id, action: "owner_status_changed", entityType: "gyms", entityId: gym.id, metadata: JSON.stringify({ decision: "approve" }), createdAt: daysAgo(200) },
      { actorId: owner.id, gymId: gym.id, action: "member_created", entityType: "members", entityId: members[0].id, metadata: "{}" },
      { actorId: IDS.superAdmin, gymId: IDS.harborGym, action: "owner_status_changed", entityType: "gyms", entityId: IDS.harborGym, metadata: JSON.stringify({ decision: "suspend" }) },
    ],
  });

  await ensureCheckInTokens();
  console.log("GymFlow desk QR seed complete. Demo check-in: /g/demo-bakau-powerhouse");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
