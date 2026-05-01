import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasAuth =
    cookieStore.has("auth_token") || cookieStore.has("external_auth_token");

  if (!hasAuth) redirect("/reader");

  const navState = cookieStore.get("nav-state")?.value;
  if (navState === "reader") redirect("/reader");

  redirect("/home");
}
