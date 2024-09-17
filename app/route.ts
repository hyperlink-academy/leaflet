import { createNewLeaflet } from "actions/createNewLeaflet";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  await createNewLeaflet("doc");
}
