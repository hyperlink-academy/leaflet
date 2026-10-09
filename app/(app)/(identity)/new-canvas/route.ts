import { createNewLeaflet } from "actions/createNewLeaflet";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  let url = new URL(request.url);
  let welcomeModal = url.searchParams.has("welcomeModal");
  await createNewLeaflet({
    pageType: "canvas",
    redirectUser: true,
    welcomeModal,
    addToHome: true,
  });
}
