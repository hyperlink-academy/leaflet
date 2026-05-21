"use client";
import { PageHeader } from "components/PageHeader";
import { MobileNavigation } from "../ActionBar/MobileNavigation";
import { usePreserveScroll } from "src/hooks/usePreserveScroll";

export function DashboardPageLayout(props: {
  scrollKey: string;
  pageTitle: string;
  mobileActions?: React.ReactNode;
  controls?: React.ReactNode;
  hasSearch?: boolean;
  publication?: string;
  showHeader?: boolean;
  children: React.ReactNode;
}) {
  let { ref } = usePreserveScroll<HTMLDivElement>(props.scrollKey);

  return (
    <div
      className={`dashboardPageContent
        relative w-full h-full
        flex flex-col gap-2
         pt-3 pb-[calc(var(--safe-padding-bottom)+64px)] px-3
         sm:pt-6 sm:pb-6 sm:pl-8 sm:pr-4
         overflow-y-auto
         `}
      ref={ref}
      id="home-content"
    >
      {props.showHeader && (
        <PageHeader>
          <div className={`sm:block ${props.publication && "hidden"} grow`}>
            {props.controls}
          </div>
        </PageHeader>
      )}
      {props.children}

      <MobileNavigation
        pageTitle={props.pageTitle}
        mobileActions={props.mobileActions}
        controls={props.controls}
        hasSearch={props.hasSearch}
      />
    </div>
  );
}
