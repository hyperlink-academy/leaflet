import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AboutPage } from "../about/AboutPage";

export const metadata: Metadata = {
  title: "Leaflet — social publishing on the Atmosphere",
  description:
    "A simple and powerful platform for social publishing — blogs, newsletters, and more!",
};

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasAuth =
    cookieStore.has("auth_token") || cookieStore.has("external_auth_token");

  if (!hasAuth) return <AboutPage />;

  const navState = cookieStore.get("nav-state")?.value;
  if (navState === "reader") redirect("/reader");

  redirect("/home");
}
