import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { WEBHOOK_SECRET } from "@/lib/constants";
import { ApiError } from "@/lib/http";
import { extendMembership } from "@/lib/membership";
import type { PaymentStatus } from "@prisma/client";

export function signWebhook(payload: string) {
  return createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
}

export function verifyWebhookSignature(payload: string, signature: string | null) {
  if (!signature) return false;
  const expected = signWebhook(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function nextInvoiceNumber(seq: number) {
  return `INV-2026-${String(seq).padStart(4, "0")}`;
}

export async function createMemberIntent(input: {
  memberId: string;
  gymId: string;
  amount: number;
  currency: string;
  actorId?: string;
}) {
  const open = await prisma.paymentMember.findFirst({
    where: { memberId: input.memberId, gymId: input.gymId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  if (open) return open;

  const payment = await prisma.paymentMember.create({
    data: {
      memberId: input.memberId,
      gymId: input.gymId,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
    },
  });
  await writeAudit({
    actorId: input.actorId,
    gymId: input.gymId,
    action: "payment_intent_created",
    entityType: "payments_member",
    entityId: payment.id,
    metadata: { amount: input.amount },
  });
  return payment;
}

export async function acceptMemberPayment(input: {
  paymentId: string;
  gymId: string;
  actorId: string;
}) {
  const payment = await prisma.paymentMember.findFirst({
    where: { id: input.paymentId, gymId: input.gymId },
    include: { member: true },
  });
  if (!payment) throw new ApiError(404, "not_found", "Payment not found.");
  if (payment.status !== "pending" && payment.status !== "failed") {
    throw new ApiError(400, "invalid_state", "Only pending or failed demo payments can be accepted.");
  }
  const updated = await prisma.paymentMember.update({
    where: { id: payment.id },
    data: {
      status: "paid",
      paidAt: new Date(),
      providerRef: payment.providerRef ?? `desk_${payment.id.slice(0, 8)}`,
    },
    include: { member: true },
  });
  await extendMembership(payment.memberId);
  await writeAudit({
    actorId: input.actorId,
    gymId: input.gymId,
    action: "payment_accepted",
    entityType: "payments_member",
    entityId: payment.id,
    metadata: { source: "desk_demo" },
  });
  return updated;
}

export async function recordDeskPayment(input: {
  memberId: string;
  gymId: string;
  actorId: string;
}) {
  const member = await prisma.member.findFirst({
    where: { id: input.memberId, gymId: input.gymId },
    include: { plan: true },
  });
  if (!member) throw new ApiError(404, "not_found", "Member not found.");
  const open = await prisma.paymentMember.findFirst({
    where: { memberId: member.id, gymId: input.gymId, status: { in: ["pending", "failed"] } },
    orderBy: { createdAt: "desc" },
  });
  if (open) {
    return acceptMemberPayment({
      paymentId: open.id,
      gymId: input.gymId,
      actorId: input.actorId,
    });
  }
  const payment = await prisma.paymentMember.create({
    data: {
      memberId: member.id,
      gymId: input.gymId,
      amount: Number(member.plan.price),
      currency: member.plan.currency,
      status: "paid",
      paidAt: new Date(),
      providerRef: `desk_${randomBytes(4).toString("hex")}`,
    },
    include: { member: true },
  });
  await extendMembership(member.id);
  await writeAudit({
    actorId: input.actorId,
    gymId: input.gymId,
    action: "payment_recorded_at_desk",
    entityType: "payments_member",
    entityId: payment.id,
    metadata: { source: "manual_activation" },
  });
  return payment;
}

export async function applyProviderEvent(input: {
  provider: string;
  eventId: string;
  kind: "member" | "platform";
  paymentId: string;
  status: "succeeded" | "failed" | "canceled";
  ref: string;
}) {
  const existing = await prisma.webhookEvent.findUnique({ where: { id: input.eventId } });
  if (existing) return { duplicate: true as const };

  if (input.kind === "member") {
    const payment = await prisma.paymentMember.findUnique({ where: { id: input.paymentId } });
    if (!payment) throw new ApiError(404, "not_found", "Payment not found.");
    const nextStatus: PaymentStatus =
      input.status === "succeeded" ? "paid" : "failed";
    if (payment.status === "paid" || payment.status === "refunded") {
      await prisma.webhookEvent.create({
        data: { id: input.eventId, provider: input.provider, payload: JSON.stringify(input) },
      });
      return { duplicate: true as const };
    }
    await prisma.paymentMember.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        paidAt: nextStatus === "paid" ? new Date() : null,
        providerRef: input.ref,
      },
    });
    if (nextStatus === "paid") {
      await extendMembership(payment.memberId);
    }
    await writeAudit({
      gymId: payment.gymId,
      action: "payment_webhook_applied",
      entityType: "payments_member",
      entityId: payment.id,
      metadata: { status: nextStatus, eventId: input.eventId },
    });
  } else {
    const payment = await prisma.paymentPlatform.findUnique({ where: { id: input.paymentId } });
    if (!payment) throw new ApiError(404, "not_found", "Invoice not found.");
    const nextStatus: PaymentStatus =
      input.status === "succeeded" ? "paid" : "failed";
    if (payment.status === "paid" || payment.status === "refunded") {
      await prisma.webhookEvent.create({
        data: { id: input.eventId, provider: input.provider, payload: JSON.stringify(input) },
      });
      return { duplicate: true as const };
    }
    await prisma.paymentPlatform.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        paidAt: nextStatus === "paid" ? new Date() : null,
        providerRef: input.ref,
      },
    });
    await writeAudit({
      actorId: payment.gymOwnerId,
      action: "platform_payment_webhook_applied",
      entityType: "payments_platform",
      entityId: payment.id,
      metadata: { status: nextStatus, eventId: input.eventId },
    });
  }

  await prisma.webhookEvent.create({
    data: { id: input.eventId, provider: input.provider, payload: JSON.stringify(input) },
  });
  return { duplicate: false as const };
}

export function demoEventId() {
  return `evt_${randomBytes(8).toString("hex")}`;
}

export function demoRef() {
  return `pay_${randomBytes(8).toString("hex")}`;
}
