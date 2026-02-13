"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Header } from "components/PageHeader";
import { Footer } from "components/ActionBar/Footer";
import { DesktopNavigation } from "components/ActionBar/DesktopNavigation";
import { MobileNavigation } from "components/ActionBar/MobileNavigation";
import { MediaContents } from "components/Media";
import { DashboardIdContext } from "components/PageLayouts/DashboardLayout";
import { useIdentityData } from "components/IdentityProvider";

const allTabs = [
  { name: "Subs", href: "/reader", requiresAuth: true },
  { name: "What's Hot", href: "/reader/hot", requiresAuth: false },
  { name: "New", href: "/reader/new", requiresAuth: false },
];

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { identity } = useIdentityData();
  const isLoggedIn = !!identity?.atp_did;
  const tabs = allTabs.filter((tab) => !tab.requiresAuth || isLoggedIn);

  const isActive = (href: string) => {
    if (href === "/reader")
      return pathname === "/reader" || pathname === "/";
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
          <Header>
            <div className="pubDashTabs flex flex-row gap-1">
              {tabs.map((tab) => (
                <Link key={tab.name} href={tab.href}>
                  <div
                    className={`pubTabs px-1 py-0 flex gap-1 items-center rounded-md hover:cursor-pointer ${
                      isActive(tab.href)
                        ? "text-accent-2 bg-accent-1 font-bold -mb-px"
                        : "text-tertiary"
                    }`}
                  >
                    {tab.name}
                  </div>
                </Link>
              ))}
            </div>
            <div className="sm:block grow" />
          </Header>
          {children}
        </div>
        <Footer>
          <MobileNavigation currentPage="reader" />
        </Footer>
      </div>
    </DashboardIdContext.Provider>
  );
}
