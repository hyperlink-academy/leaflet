"use client";

import { usePathname, useRouter } from "next/navigation";
import { PageHeader } from "components/PageHeader";
import { DesktopNavigation } from "components/ActionBar/DesktopNavigation";
import { MediaContents } from "components/Media";
import { DashboardIdContext } from "components/PageLayouts/DashboardLayout";
import { useIdentityData } from "components/IdentityProvider";
import { Tab } from "components/Tab";

const allTabs = [
  { name: "Subs", href: "/reader", requiresAuth: true },
  { name: "Trending", href: "/reader/hot", requiresAuth: false },
  { name: "New", href: "/reader/new", requiresAuth: false },
];

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { identity } = useIdentityData();
  const isLoggedIn = !!identity?.atp_did;
  const tabs = allTabs.filter((tab) => !tab.requiresAuth || isLoggedIn);

  const isActive = (href: string) => {
    if (href === "/reader") return pathname === "/reader" || pathname === "/";
    if (
      href === "/reader/hot" &&
      !isLoggedIn &&
      (pathname === "/reader" || pathname === "/")
    )
      return true;
    return pathname.startsWith(href);
  };

  return (
    <DashboardIdContext.Provider value="reader">
      <div className="dashboard pwa-padding relative max-w-(--breakpoint-lg) w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6">
        <MediaContents mobile={false}>
          <div className="flex flex-col gap-3 my-6">
            <DesktopNavigation currentPage="reader" />
          </div>
        </MediaContents>
        <div
          className="w-full h-full flex flex-col gap-2 relative overflow-y-scroll pt-3 pb-3 px-3 sm:pt-8 sm:pb-3 sm:pl-6 sm:pr-4"
          id="home-content"
        >
          <PageHeader>
            <div className="pubDashTabs flex flex-row gap-1">
              {tabs.map((tab) => (
                <Tab
                  key={tab.name}
                  name={tab.name}
                  selected={isActive(tab.href)}
                  onSelect={() => router.push(tab.href)}
                />
              ))}
            </div>
            <div className="sm:block grow" />
          </PageHeader>
          {children}
        </div>
      </div>
    </DashboardIdContext.Provider>
  );
}
