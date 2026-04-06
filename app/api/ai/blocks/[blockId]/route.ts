import { NextRequest } from "next/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, eq, and } from "drizzle-orm";
import { pool } from "supabase/pool";
import { facts, entities } from "drizzle/schema";
import {
  authenticateToken,
  broadcastPoke,
  tokenHash,
  hasWriteAccess,
  editYjsText,
  EditOperation,
} from "../../lib";

type Params = { params: Promise<{ blockId: string }> };

// --- DELETE ---

export async function DELETE(req: NextRequest, { params }: Params) {
  let auth = await authenticateToken(req);
  if (auth instanceof Response) return auth;

  if (!hasWriteAccess(auth)) {
    return Response.json({ error: "No write access" }, { status: 403 });
  }

  let { blockId } = await params;

  let client = await pool.connect();
  try {
    let db = drizzle(client);
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${tokenHash(auth.tokenId)})`);

      // Verify the block entity exists
      let [entity] = await tx
        .select({ id: entities.id, set: entities.set })
        .from(entities)
        .where(eq(entities.id, blockId));

      if (!entity) {
        throw Response.json({ error: "Block not found" }, { status: 404 });
      }

      // Verify permission
      let hasAccess = auth.tokenRights.some(
        (r) => r.entity_set === entity.set && r.write,
      );
      if (!hasAccess) {
        throw Response.json({ error: "Block not found" }, { status: 404 });
      }

      // Check for image to clean up
      let [imageFact] = await tx
        .select({ data: facts.data })
        .from(facts)
        .where(and(eq(facts.entity, blockId), eq(facts.attribute, "block/image")));

      if (imageFact) {
        let { createClient } = await import("@supabase/supabase-js");
        let supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
          process.env.SUPABASE_SERVICE_ROLE_KEY as string,
        );
        let src = (imageFact.data as any).src;
        if (src) {
          let paths = src.split("/");
          await supabase.storage
            .from("minilink-user-assets")
            .remove([paths[paths.length - 1]]);
        }
      }

      // Delete the entity (cascades to facts)
      await tx.delete(entities).where(eq(entities.id, blockId));

      // Also delete referencing facts (card/block pointing to this entity)
      await tx.delete(facts).where(
        and(
          eq(facts.attribute, "card/block"),
          sql`data->>'value' = ${blockId}`,
        ),
      );
    });

    await broadcastPoke(auth.rootEntity);
    return Response.json({ deleted: blockId });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("AI API delete error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  } finally {
    client.release();
  }
}

// --- PATCH ---

export async function PATCH(req: NextRequest, { params }: Params) {
  let auth = await authenticateToken(req);
  if (auth instanceof Response) return auth;

  if (!hasWriteAccess(auth)) {
    return Response.json({ error: "No write access" }, { status: 403 });
  }

  let { blockId } = await params;

  let body: {
    action?: "replace" | "insert";
    content?: string;
    position?: "start" | "end" | { before: string } | { after: string };
    language?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let hasContentEdit = body.action !== undefined || body.content !== undefined;
  if (hasContentEdit && (!body.action || body.content === undefined)) {
    return Response.json(
      { error: "action and content required together" },
      { status: 400 },
    );
  }
  if (!hasContentEdit && body.language === undefined) {
    return Response.json(
      { error: "must provide action+content or language" },
      { status: 400 },
    );
  }

  let client = await pool.connect();
  try {
    let db = drizzle(client);
    let result: { blockId: string; newText: string } | null = null;

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${tokenHash(auth.tokenId)})`);

      // Verify the block entity exists
      let [entity] = await tx
        .select({ id: entities.id, set: entities.set })
        .from(entities)
        .where(eq(entities.id, blockId));

      if (!entity) {
        throw Response.json({ error: "Block not found" }, { status: 404 });
      }

      let hasAccess = auth.tokenRights.some(
        (r) => r.entity_set === entity.set && r.write,
      );
      if (!hasAccess) {
        throw Response.json({ error: "Block not found" }, { status: 404 });
      }

      // Get block type
      let [typeFact] = await tx
        .select({ id: facts.id, data: facts.data })
        .from(facts)
        .where(and(eq(facts.entity, blockId), eq(facts.attribute, "block/type")));

      if (!typeFact) {
        throw Response.json({ error: "Block has no type" }, { status: 400 });
      }

      let blockType = (typeFact.data as any).value;

      if (
        blockType === "text" ||
        blockType === "heading" ||
        blockType === "blockquote"
      ) {
        if (body.language !== undefined) {
          throw Response.json(
            { error: "language only applies to code blocks" },
            { status: 400 },
          );
        }
        if (!hasContentEdit) {
          throw Response.json(
            { error: "action and content required" },
            { status: 400 },
          );
        }
        // YJS content
        let [textFact] = await tx
          .select({ id: facts.id, data: facts.data })
          .from(facts)
          .where(
            and(eq(facts.entity, blockId), eq(facts.attribute, "block/text")),
          );

        let existingBase64 = textFact ? (textFact.data as any).value : null;
        let content = body.content as string;

        let operation: EditOperation;
        if (body.action === "replace") {
          operation = { type: "replace", content };
        } else {
          operation = {
            type: "insert",
            position: body.position || "end",
            content,
          } as EditOperation;
        }

        if (!existingBase64) {
          // No existing text, create new
          let { createYjsText } = await import("../../lib");
          let newBase64 = createYjsText(content);
          if (textFact) {
            await tx
              .update(facts)
              .set({ data: sql`jsonb_set(data, '{value}', ${JSON.stringify(newBase64)}::jsonb)` })
              .where(eq(facts.id, textFact.id));
          } else {
            let { v7 } = await import("uuid");
            await tx.insert(facts).values({
              id: v7(),
              entity: blockId,
              attribute: "block/text",
              data: sql`${JSON.stringify({ type: "text", value: newBase64 })}::jsonb`,
            });
          }
          result = { blockId, newText: content };
        } else {
          let editResult = editYjsText(existingBase64, operation);

          if ("error" in editResult) {
            throw Response.json(
              {
                error: "search_not_found",
                blockText: editResult.fullText,
              },
              { status: 400 },
            );
          }

          await tx
            .update(facts)
            .set({
              data: sql`jsonb_set(data, '{value}', ${JSON.stringify(editResult.result)}::jsonb)`,
            })
            .where(eq(facts.id, textFact.id));

          result = { blockId, newText: editResult.plaintext };
        }
      } else if (blockType === "code") {
        // Plain string content
        let [codeFact] = await tx
          .select({ id: facts.id, data: facts.data })
          .from(facts)
          .where(
            and(eq(facts.entity, blockId), eq(facts.attribute, "block/code")),
          );

        let existingCode = codeFact ? ((codeFact.data as any).value as string) : "";
        let newCode = existingCode;

        if (hasContentEdit) {
          let content = body.content as string;
          if (body.action === "replace") {
            newCode = content;
          } else {
            let pos = body.position || "end";
            if (pos === "start") {
              newCode = content + existingCode;
            } else if (pos === "end") {
              newCode = existingCode + content;
            } else if (typeof pos === "object" && "before" in pos) {
              let idx = existingCode.indexOf(pos.before);
              if (idx === -1) {
                throw Response.json(
                  { error: "search_not_found", blockText: existingCode },
                  { status: 400 },
                );
              }
              newCode =
                existingCode.slice(0, idx) +
                content +
                existingCode.slice(idx);
            } else if (typeof pos === "object" && "after" in pos) {
              let idx = existingCode.indexOf(pos.after);
              if (idx === -1) {
                throw Response.json(
                  { error: "search_not_found", blockText: existingCode },
                  { status: 400 },
                );
              }
              newCode =
                existingCode.slice(0, idx + pos.after.length) +
                content +
                existingCode.slice(idx + pos.after.length);
            } else {
              newCode = existingCode + content;
            }
          }

          if (codeFact) {
            await tx
              .update(facts)
              .set({
                data: sql`jsonb_set(data, '{value}', ${JSON.stringify(newCode)}::jsonb)`,
              })
              .where(eq(facts.id, codeFact.id));
          } else {
            let { v7 } = await import("uuid");
            await tx.insert(facts).values({
              id: v7(),
              entity: blockId,
              attribute: "block/code",
              data: sql`${JSON.stringify({ type: "string", value: newCode })}::jsonb`,
            });
          }
        }

        // Handle language update
        if (body.language !== undefined) {
          let [langFact] = await tx
            .select({ id: facts.id })
            .from(facts)
            .where(
              and(
                eq(facts.entity, blockId),
                eq(facts.attribute, "block/code-language"),
              ),
            );

          if (body.language === null || body.language === "") {
            // Remove language
            if (langFact) {
              await tx.delete(facts).where(eq(facts.id, langFact.id));
            }
          } else {
            let langData = { type: "string", value: body.language };
            if (langFact) {
              await tx
                .update(facts)
                .set({ data: sql`${JSON.stringify(langData)}::jsonb` })
                .where(eq(facts.id, langFact.id));
            } else {
              let { v7 } = await import("uuid");
              await tx.insert(facts).values({
                id: v7(),
                entity: blockId,
                attribute: "block/code-language",
                data: sql`${JSON.stringify(langData)}::jsonb`,
              });
            }
          }
        }

        result = { blockId, newText: newCode };
      } else {
        throw Response.json(
          { error: `Cannot edit blocks of type '${blockType}'` },
          { status: 400 },
        );
      }
    });

    await broadcastPoke(auth.rootEntity);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("AI API patch error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  } finally {
    client.release();
  }
}
