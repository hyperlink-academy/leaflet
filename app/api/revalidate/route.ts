import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "crypto";

// Internal endpoint for services outside the Next.js process (the appview
// firehose consumer) to invalidate cached published pages by tag after they
// write to Postgres. Tag names come from src/cacheTags.ts.
//
// Authentication: `Authorization: Bearer <REVALIDATE_SECRET>`, compared
// constant-time.

const MAX_TAGS = 100;

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.error("[revalidate] REVALIDATE_SECRET is not configured");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let tags: unknown;
  try {
    tags = ((await req.json()) as { tags?: unknown })?.tags;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (
    !Array.isArray(tags) ||
    tags.length === 0 ||
    tags.length > MAX_TAGS ||
    !tags.every((t) => typeof t === "string" && t.length > 0 && t.length < 512)
  ) {
    return NextResponse.json(
      { error: `tags must be 1-${MAX_TAGS} non-empty strings` },
      { status: 400 },
    );
  }

  for (const tag of tags as string[]) {
    revalidateTag(tag, "max");
  }
  return NextResponse.json({ revalidated: tags });
}
