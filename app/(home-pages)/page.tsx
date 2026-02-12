import { cookies } from "next/headers";
import ReaderLayout from "./reader/layout";
import ReaderPage from "./reader/page";
import HomePage from "./home/page";

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasAuth =
    cookieStore.has("auth_token") ||
    cookieStore.has("external_auth_token");

  if (!hasAuth) {
    return (
      <ReaderLayout>
        <ReaderPage />
      </ReaderLayout>
    );
  }

  const navState = cookieStore.get("nav-state")?.value;

  if (navState === "reader") {
    return (
      <ReaderLayout>
        <ReaderPage />
      </ReaderLayout>
    );
  }

  return <HomePage />;
}
