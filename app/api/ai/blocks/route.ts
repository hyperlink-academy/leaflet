import { NextRequest } from "next/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, eq } from "drizzle-orm";
import { pool } from "supabase/pool";
import { permission_token_rights } from "drizzle/schema";
import { cachedServerMutationContext } from "src/replicache/cachedServerMutationContext";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";
import {
  authenticateToken,
  resolvePageEntity,
  getPageBlocks,
  createYjsText,
  broadcastPoke,
  tokenHash,
  hasWriteAccess,
} from "../lib";

type BlockInput =
  | { type: "text"; content: string }
  | { type: "heading"; content: string; level?: number }
  | { type: "code"; content: string; language?: string }
  | { type: "blockquote"; content: string }
  | { type: "horizontal-rule" };

type PositionInput =
  | "start"
  | "end"
  | { after: string }
  | { before: string };

export async function POST(req: NextRequest) {
  let auth = await authenticateToken(req);
  if (auth instanceof Response) return auth;

  if (!hasWriteAccess(auth)) {
    return Response.json({ error: "No write access" }, { status: 403 });
  }

  let body: { page?: string; position: PositionInput; blocks: BlockInput[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.blocks || !Array.isArray(body.blocks) || body.blocks.length === 0) {
    return Response.json({ error: "blocks array required" }, { status: 400 });
  }
  if (!body.position) {
    return Response.json({ error: "position required" }, { status: 400 });
  }

  let client = await pool.connect();
  try {
    let db = drizzle(client);
    let createdBlocks: { blockId: string; type: string }[] = [];

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${tokenHash(auth.tokenId)})`);

      let pageEntity = await resolvePageEntity(tx, auth.rootEntity, body.page);
      if (pageEntity instanceof Response) throw pageEntity;

      let token_rights = await tx
        .select()
        .from(permission_token_rights)
        .where(eq(permission_token_rights.token, auth.tokenId));

      let { getContext, flush } = cachedServerMutationContext(
        tx,
        auth.tokenId,
        token_rights,
      );
      let ctx = getContext("ai-api", 0);

      let existingBlocks = await getPageBlocks(tx, pageEntity as string);
      let sorted = existingBlocks.sort((a, b) =>
        a.position > b.position ? 1 : -1,
      );

      // Compute initial position based on body.position
      let currentPosition: string;
      let pos = body.position;

      if (pos === "start") {
        currentPosition = generateKeyBetween(
          null,
          sorted[0]?.position || null,
        );
      } else if (pos === "end") {
        currentPosition = generateKeyBetween(
          sorted[sorted.length - 1]?.position || null,
          null,
        );
      } else if ("after" in pos) {
        let targetIdx = sorted.findIndex((b) => b.value === pos.after);
        if (targetIdx === -1) {
          throw Response.json({ error: "Block not found for 'after'" }, { status: 404 });
        }
        currentPosition = generateKeyBetween(
          sorted[targetIdx].position,
          sorted[targetIdx + 1]?.position || null,
        );
      } else if ("before" in pos) {
        let targetIdx = sorted.findIndex((b) => b.value === pos.before);
        if (targetIdx === -1) {
          throw Response.json({ error: "Block not found for 'before'" }, { status: 404 });
        }
        currentPosition = generateKeyBetween(
          sorted[targetIdx - 1]?.position || null,
          sorted[targetIdx].position,
        );
      } else {
        throw Response.json({ error: "Invalid position" }, { status: 400 });
      }

      // Track the next position boundary for chaining
      let nextBound: string | null = null;
      if (pos === "start" && sorted.length > 0) {
        nextBound = sorted[0].position;
      } else if (typeof pos === "object" && "before" in pos) {
        let targetIdx = sorted.findIndex((b) => b.value === pos.before);
        nextBound = sorted[targetIdx].position;
      }

      for (let i = 0; i < body.blocks.length; i++) {
        let block = body.blocks[i];
        let newEntityID = v7();
        let factID = v7();

        // For subsequent blocks, chain after the previous position
        if (i > 0) {
          currentPosition = generateKeyBetween(currentPosition, nextBound);
        }

        await ctx.createEntity({
          entityID: newEntityID,
          permission_set: auth.permissionSet!,
        });

        await ctx.assertFact({
          entity: pageEntity as string,
          id: factID,
          data: {
            type: "ordered-reference" as const,
            value: newEntityID,
            position: currentPosition,
          },
          attribute: "card/block" as const,
        });

        let blockType: string;

        if (block.type === "text") {
          blockType = "text";
          await ctx.assertFact({
            entity: newEntityID,
            data: { type: "block-type-union" as const, value: "text" },
            attribute: "block/type" as const,
          });
          await ctx.assertFact({
            entity: newEntityID,
            data: { type: "text" as const, value: createYjsText(block.content) },
            attribute: "block/text" as const,
          });
        } else if (block.type === "heading") {
          blockType = "heading";
          await ctx.assertFact({
            entity: newEntityID,
            data: { type: "block-type-union" as const, value: "heading" },
            attribute: "block/type" as const,
          });
          await ctx.assertFact({
            entity: newEntityID,
            data: { type: "text" as const, value: createYjsText(block.content) },
            attribute: "block/text" as const,
          });
          await ctx.assertFact({
            entity: newEntityID,
            data: { type: "number" as const, value: block.level || 1 },
            attribute: "block/heading-level" as const,
          });
        } else if (block.type === "code") {
          blockType = "code";
          await ctx.assertFact({
            entity: newEntityID,
            data: { type: "block-type-union" as const, value: "code" },
            attribute: "block/type" as const,
          });
          await ctx.assertFact({
            entity: newEntityID,
            data: { type: "string" as const, value: block.content },
            attribute: "block/code" as const,
          });
          if (block.language) {
            await ctx.assertFact({
              entity: newEntityID,
              data: { type: "string" as const, value: block.language },
              attribute: "block/code-language" as const,
            });
          }
        } else if (block.type === "blockquote") {
          blockType = "blockquote";
          await ctx.assertFact({
            entity: newEntityID,
            data: { type: "block-type-union" as const, value: "blockquote" },
            attribute: "block/type" as const,
          });
          await ctx.assertFact({
            entity: newEntityID,
            data: { type: "text" as const, value: createYjsText(block.content) },
            attribute: "block/text" as const,
          });
        } else if (block.type === "horizontal-rule") {
          blockType = "horizontal-rule";
          await ctx.assertFact({
            entity: newEntityID,
            data: { type: "block-type-union" as const, value: "horizontal-rule" },
            attribute: "block/type" as const,
          });
        } else {
          continue;
        }

        createdBlocks.push({ blockId: newEntityID, type: blockType });
      }

      await flush();
    });

    await broadcastPoke(auth.rootEntity);

    return Response.json({ blocks: createdBlocks });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("AI API blocks error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  } finally {
    client.release();
  }
}
