import { NextRequest } from "next/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { email_subscriptions_to_entity } from "drizzle/schema";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { pool } from "supabase/pool";

export async function POST(request: NextRequest) {
  let sub_id = request.nextUrl.searchParams.get("sub_id");
  if (!sub_id) return new Response(null, { status: 404 });
  const client = await pool.connect();
  const db = drizzle(client);

  try {
    await db
      .delete(email_subscriptions_to_entity)
      .where(eq(email_subscriptions_to_entity.id, sub_id));
  } catch (error) {
    console.log(error);
  }
  client.release();
  return new Response(null, { status: 200 });
}
