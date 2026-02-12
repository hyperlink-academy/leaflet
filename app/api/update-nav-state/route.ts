import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { state } = (await request.json()) as { state: string };
  if (state !== "home" && state !== "reader") {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("nav-state", state, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
