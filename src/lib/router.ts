import { NextRequest, NextResponse } from "next/server";
import { ApiError, fail, requestIdFrom } from "@/lib/http";
import * as h from "@/lib/handlers";

type Handler = (ctx: {
  request: NextRequest;
  params: Record<string, string>;
  requestId: string;
}) => Promise<NextResponse>;

type Route = { method: string; pattern: string; handler: Handler };

const routes: Route[] = [
  { method: "POST", pattern: "/auth/signup", handler: h.handleSignup },
  { method: "POST", pattern: "/auth/login", handler: h.handleLogin },
  { method: "POST", pattern: "/auth/refresh", handler: h.handleRefresh },
  { method: "POST", pattern: "/auth/logout", handler: h.handleLogout },
  { method: "GET", pattern: "/auth/session", handler: h.handleSession },
  { method: "GET", pattern: "/admin/owners", handler: h.handleAdminOwners },
  { method: "PATCH", pattern: "/admin/owners/:id/status", handler: h.handleOwnerStatus },
  { method: "GET", pattern: "/admin/payments/platform", handler: h.handleAdminPlatformPayments },
  { method: "GET", pattern: "/admin/analytics", handler: h.handleAdminAnalytics },
  { method: "GET", pattern: "/admin/settings", handler: h.handleGetAdminSettings },
  { method: "PUT", pattern: "/admin/settings", handler: h.handlePutAdminSettings },
  { method: "POST", pattern: "/gyms", handler: h.handleCreateGym },
  { method: "GET", pattern: "/gyms/:gymId/dashboard", handler: h.handleOwnerDashboard },
  { method: "GET", pattern: "/gyms/:gymId/members", handler: h.handleListMembers },
  { method: "POST", pattern: "/gyms/:gymId/members", handler: h.handleRegisterMember },
  { method: "PATCH", pattern: "/gyms/:gymId/members/:memberId", handler: h.handlePatchMember },
  { method: "GET", pattern: "/gyms/:gymId/payments", handler: h.handleGymPayments },
  { method: "POST", pattern: "/gyms/:gymId/payments/:paymentId/refund", handler: h.handleRefundMemberPayment },
  { method: "GET", pattern: "/gyms/:gymId/settings", handler: h.handleGymSettings },
  { method: "PATCH", pattern: "/gyms/:gymId/settings", handler: h.handleGymSettings },
  { method: "GET", pattern: "/gyms/:gymId/plans", handler: h.handlePlans },
  { method: "POST", pattern: "/gyms/:gymId/plans", handler: h.handlePlans },
  { method: "GET", pattern: "/gyms/:gymId/staff", handler: h.handleStaff },
  { method: "POST", pattern: "/gyms/:gymId/staff", handler: h.handleStaff },
  { method: "POST", pattern: "/gyms/:gymId/check-ins", handler: h.handleCheckIn },
  { method: "GET", pattern: "/me", handler: h.handleMe },
  { method: "GET", pattern: "/me/attendance", handler: h.handleMyAttendance },
  { method: "POST", pattern: "/me/payments/intents", handler: h.handleMyPaymentIntent },
  { method: "GET", pattern: "/platform/invoices", handler: h.handleOwnerInvoices },
  { method: "POST", pattern: "/platform/invoices/:id/pay", handler: h.handlePlatformPay },
  { method: "POST", pattern: "/payments/webhooks/:provider", handler: h.handleWebhook },
  { method: "GET", pattern: "/payments/:id", handler: h.handlePaymentLookup },
  { method: "POST", pattern: "/payments/:id/demo-complete", handler: h.handleDemoCheckout },
];

function match(method: string, path: string) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const keys: string[] = [];
    const regex = new RegExp(
      "^" +
        route.pattern
          .split("/")
          .map((part) => {
            if (part.startsWith(":")) {
              keys.push(part.slice(1));
              return "([^/]+)";
            }
            return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          })
          .join("/") +
        "$",
    );
    const found = path.match(regex);
    if (!found) continue;
    const params: Record<string, string> = {};
    keys.forEach((key, index) => {
      params[key] = decodeURIComponent(found[index + 1]);
    });
    return { handler: route.handler, params };
  }
  return null;
}

export async function dispatch(request: NextRequest, segments: string[], method: string) {
  const requestId = requestIdFrom(request);
  const path = "/" + segments.join("/");
  const matched = match(method, path);
  if (!matched) {
    return fail(requestId, 404, "not_found", "Endpoint not found.");
  }
  try {
    return await matched.handler({ request, params: matched.params, requestId });
  } catch (error) {
    if (error instanceof ApiError) {
      return fail(requestId, error.status, error.type, error.message);
    }
    console.error(error);
    return fail(requestId, 500, "internal", "Something went wrong.");
  }
}
