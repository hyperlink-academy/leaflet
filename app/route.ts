import { createNewLeaflet } from "actions/createNewLeaflet";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  redirect("/home");
}
