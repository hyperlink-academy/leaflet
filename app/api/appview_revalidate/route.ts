import { NextRequest, NextResponse } from "next/server";
import {
  revalidateAllPublicationPaths,
  revalidateDocumentPaths,
} from "src/utils/revalidatePublication";

// Called by the appview firehose consumer (appview/index.ts) after it indexes
// a record that a cached (published) page renders. Leaflet's own actions
// revalidate in-process when they write; this endpoint is what keeps the long
// ISR revalidate window honest for writes arriving over the firehose from
// other AT Protocol clients (and for comment/recommend counts, which are
// server-rendered into post pages).
//
// The appview posts events *after* its DB writes land, so a re-render
// triggered here always reads the indexed state. Deletes carry a `snapshot`
// captured before the rows were removed, since the paths can no longer be
// derived from the DB.
//
// Deliberately unauthenticated: the worst a caller can do is force pages that
// already render from indexed public data to re-render.
export type AppviewRevalidateEvent =
  | {
      kind: "document";
      uri: string;
      snapshot?: {
        publication?: string | null;
        path?: string | null;
        sort_date?: string | null;
      };
    }
  | { kind: "publication"; uri: string; names: (string | null | undefined)[] }
  | { kind: "interaction"; document: string };

export async function POST(request: NextRequest) {
  let event: AppviewRevalidateEvent;
  try {
    event = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  switch (event.kind) {
    case "document":
      if (typeof event.uri !== "string")
        return new NextResponse(null, { status: 400 });
      await revalidateDocumentPaths(event.uri, { snapshot: event.snapshot });
      break;
    case "publication":
      if (typeof event.uri !== "string")
        return new NextResponse(null, { status: 400 });
      await revalidateAllPublicationPaths(event.uri, event.names ?? []);
      break;
    case "interaction":
      if (typeof event.document !== "string")
        return new NextResponse(null, { status: 400 });
      await revalidateDocumentPaths(event.document, { neighbours: false });
      break;
    default:
      return new NextResponse(null, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
