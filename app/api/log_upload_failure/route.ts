import { NextRequest, NextResponse } from "next/server";

// Image uploads happen client-side, so their failures are invisible to us —
// the only witness would be the user's console. The uploader mirrors each
// failure here so it lands in server logs.
export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {}
  console.error("[image-upload-failure]", JSON.stringify(body)?.slice(0, 4096));
  return new NextResponse(null, { status: 204 });
}
