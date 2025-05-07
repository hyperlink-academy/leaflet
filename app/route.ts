import { createNewLeaflet } from "actions/createNewLeaflet";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  let auth_token = (await cookies()).get("auth_token")?.value;
  if (auth_token) redirect("/home");
  else await createNewLeaflet("doc", true);
}
