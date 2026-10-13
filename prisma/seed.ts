import {
  PrismaClient,
  type GymStatus,
  type MemberStatus,
  type PaymentStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD, IDS } from "../src/lib/constants";

const prisma = new PrismaClient();

function daysAgo(days: number, hours = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, Math.floor(Math.random() * 50), 0, 0);
  return d;
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { id: IDS.superAdmin } });
  if (existing) {
    console.log("Seed already applied.");
    return;
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
      name: "IronForge Athletics",
      phone: "(510) 555-0148",
      email: "zara.a@example.net",
      address: "1840 Mandela Pkwy, Oakland, CA 94607",
      status: "active",
      settingsJson: JSON.stringify({
        currency: "USD",
        timezone: "America/Los_Angeles",
        checkin_notes: "Members check in at the front desk or with a staff code.",
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
    data: { gymId: gym.id, name: "Day Pass", price: 22, currency: "USD", durationDays: 1, active: true },
  });
  const monthly = await prisma.membershipPlan.create({
    data: { gymId: gym.id, name: "Strength Monthly", price: 89, currency: "USD", durationDays: 30, active: true },
  });
  const quarterly = await prisma.membershipPlan.create({
    data: { gymId: gym.id, name: "Unlimited Quarterly", price: 239, currency: "USD", durationDays: 90, active: true },
  });
  await prisma.membershipPlan.create({
    data: { gymId: gym.id, name: "Annual Iron", price: 799, currency: "USD", durationDays: 365, active: true },
  });

  const roster: Array<{
    id?: string;
    name: string;
    email: string;
    phone: string;
    planId: string;
    status: MemberStatus;
    joined: number;
    expiresIn: number | null;
  }> = [
    { id: IDS.jordan, name: "Jordan Hale", email: "victor.l@example.com", phone: "(510) 555-0191", planId: monthly.id, status: "active", joined: 86, expiresIn: 18 },
    { name: "Priya Shah", email: "nathan.k@example.net", phone: "(510) 555-0133", planId: quarterly.id, status: "active", joined: 140, expiresIn: 52 },
    { name: "Marcus Chen", email: "yosef.c@example.com", phone: "(510) 555-0177", planId: monthly.id, status: "active", joined: 44, expiresIn: 12 },
    { name: "Sofia Alvarez", email: "sofia.alvarez@example.com", phone: "(415) 555-0108", planId: monthly.id, status: "expired", joined: 120, expiresIn: -6 },
    { name: "Noah Patel", email: "noah.patel@example.com", phone: "(510) 555-0162", planId: quarterly.id, status: "inactive", joined: 200, expiresIn: 20 },
    { name: "Avery Kim", email: "avery.kim@example.com", phone: "(510) 555-0188", planId: monthly.id, status: "active", joined: 21, expiresIn: 9 },
    { name: "Liam Brooks", email: "liam.brooks@example.com", phone: "(510) 555-0114", planId: dayPass.id, status: "active", joined: 1, expiresIn: 0 },
    { name: "Maya Ortiz", email: "maya.ortiz@example.com", phone: "(510) 555-0129", planId: monthly.id, status: "active", joined: 63, expiresIn: 4 },
    { name: "Chris Nguyen", email: "chris.nguyen@example.com", phone: "(510) 555-0155", planId: quarterly.id, status: "active", joined: 70, expiresIn: 40 },
    { name: "Hannah Cole", email: "hannah.cole@example.com", phone: "(510) 555-0199", planId: monthly.id, status: "active", joined: 15, expiresIn: 15 },
    { name: "Diego Santos", email: "diego.santos@example.com", phone: "(510) 555-0140", planId: monthly.id, status: "expired", joined: 95, expiresIn: -11 },
    { name: "Riley Thompson", email: "riley.thompson@example.com", phone: "(510) 555-0121", planId: monthly.id, status: "active", joined: 8, expiresIn: 22 },
    { name: "Samira Haddad", email: "samira.haddad@example.com", phone: "(510) 555-0171", planId: quarterly.id, status: "active", joined: 33, expiresIn: 57 },
    { name: "Owen Park", email: "owen.park@example.com", phone: "(510) 555-0104", planId: monthly.id, status: "inactive", joined: 160, expiresIn: 2 },
  ];

  const members = [];
  for (const row of roster) {
    const user = await prisma.user.create({
      data: {
        ...(row.id ? { id: row.id } : {}),
        email: row.email,
        passwordHash,
        role: "member",
        status: "active",
      },
    });
    const member = await prisma.member.create({
      data: {
        gymId: gym.id,
        userId: user.id,
        planId: row.planId,
        fullName: row.name,
        phone: row.phone,
        email: row.email,
        photoUrl: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(row.name)}`,
        status: row.status,
        joinedAt: daysAgo(row.joined),
        expiresAt: row.expiresIn === null ? null : daysAgo(-row.expiresIn),
        updatedAt: row.status === "expired" ? daysAgo(Math.abs(row.expiresIn ?? 6)) : row.status === "inactive" ? daysAgo(12) : new Date(),
      },
    });
    members.push(member);
  }

  for (const member of members) {
    const paidCount = member.status === "active" ? 3 : 2;
    for (let i = paidCount; i >= 1; i--) {
      const status: PaymentStatus = i === 1 && member.status === "expired" ? "failed" : "paid";
      await prisma.paymentMember.create({
        data: {
          memberId: member.id,
          gymId: gym.id,
          amount: member.planId === quarterly.id ? 239 : member.planId === dayPass.id ? 22 : 89,
          currency: "USD",
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
          source: day % 4 === 0 ? "owner" : "front_desk",
        },
      });
    }
  }

  await prisma.paymentPlatform.createMany({
    data: [
      { gymOwnerId: owner.id, amount: 49, currency: "USD", status: "paid", invoice: "INV-2026-0032", paidAt: daysAgo(70), createdAt: daysAgo(72), providerRef: "pay_plat_32" },
      { gymOwnerId: owner.id, amount: 49, currency: "USD", status: "paid", invoice: "INV-2026-0041", paidAt: daysAgo(40), createdAt: daysAgo(42), providerRef: "pay_plat_41" },
      { gymOwnerId: owner.id, amount: 49, currency: "USD", status: "pending", invoice: "INV-2026-0050", createdAt: daysAgo(8) },
    ],
  });

  async function otherGym(
    ownerId: string,
    gymId: string,
    email: string,
    name: string,
    status: GymStatus,
    reason: string | null,
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
        phone: "(415) 555-0180",
        address: "San Francisco Bay Area",
        status,
        statusReason: reason,
      },
    });
  }

  await otherGym(
    IDS.peakOwner,
    IDS.peakGym,
    "uma.s@example.org",
    "Peak Motion Studio",
    "pending",
    null,
  );
  await otherGym(
    IDS.harborOwner,
    IDS.harborGym,
    "cole@harborstrength.example",
    "Harbor Strength Club",
    "suspended",
    "Past-due platform invoices and unresolved billing dispute.",
    "suspended",
  );
  await otherGym(
    IDS.northsideOwner,
    IDS.northsideGym,
    "tina.r@example.net",
    "Northside Boxing",
    "rejected",
    "Could not verify facility insurance documents.",
  );

  await prisma.paymentPlatform.createMany({
    data: [
      { gymOwnerId: IDS.peakOwner, amount: 49, currency: "USD", status: "pending", invoice: "INV-2026-0051" },
      { gymOwnerId: IDS.harborOwner, amount: 49, currency: "USD", status: "failed", invoice: "INV-2026-0044", createdAt: daysAgo(20) },
    ],
  });

  await prisma.systemSetting.createMany({
    data: [
      { key: "platform_monthly_fee", value: JSON.stringify(49), updatedBy: IDS.superAdmin },
      { key: "default_currency", value: JSON.stringify("USD"), updatedBy: IDS.superAdmin },
      { key: "support_email", value: JSON.stringify("quinn.m@example.net"), updatedBy: IDS.superAdmin },
      { key: "maintenance_mode", value: JSON.stringify(false), updatedBy: IDS.superAdmin },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { actorId: IDS.superAdmin, gymId: gym.id, action: "owner_status_changed", entityType: "gyms", entityId: gym.id, metadata: JSON.stringify({ decision: "approve" }), createdAt: daysAgo(200) },
      { actorId: owner.id, gymId: gym.id, action: "member_created", entityType: "members", entityId: members[0].id, metadata: "{}" },
      { actorId: IDS.superAdmin, gymId: IDS.harborGym, action: "owner_status_changed", entityType: "gyms", entityId: IDS.harborGym, metadata: JSON.stringify({ decision: "suspend" }) },
    ],
  });

  console.log("GymFlow seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
