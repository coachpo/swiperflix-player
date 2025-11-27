import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return NextResponse.json({ ok: true, action: "dislike", id });
}
