import { NextRequest } from "next/server";
import { dispatch } from "@/lib/router";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ path: string[] }> };

async function run(request: NextRequest, ctx: Ctx, method: string) {
  const { path } = await ctx.params;
  return dispatch(request, path, method);
}

export function GET(request: NextRequest, ctx: Ctx) {
  return run(request, ctx, "GET");
}

export function POST(request: NextRequest, ctx: Ctx) {
  return run(request, ctx, "POST");
}

export function PATCH(request: NextRequest, ctx: Ctx) {
  return run(request, ctx, "PATCH");
}

export function PUT(request: NextRequest, ctx: Ctx) {
  return run(request, ctx, "PUT");
}

export function DELETE(request: NextRequest, ctx: Ctx) {
  return run(request, ctx, "DELETE");
}
