"use client";
import { DesktopHeader, MobileHeader } from "../PageHeader";
import { usePreserveScroll } from "src/hooks/usePreserveScroll";

export function DashboardPageLayout(props: {
  scrollKey: string;
  pageTitle?: string;
  actions?: React.ReactNode;
  controls?: React.ReactNode;
  publication?: string;
  showHeader?: boolean;
  children: React.ReactNode;
}) {
  let { ref } = usePreserveScroll<HTMLDivElement>(props.scrollKey);

  return (
    <div
      className={`dashboardPage w-full h-full flex flex-col gap-2 relative overflow-y-scroll pt-3 pb-3 px-3 sm:pt-6 sm:pb-6 sm:pl-8 sm:pr-4`}
      ref={ref}
      id="home-content"
    >
      {props.showHeader && (
        <>
          <MobileHeader controls={props.controls} actions={props.actions} />

          <DesktopHeader>
            <div className={`sm:block ${props.publication && "hidden"} grow`}>
              {props.controls}
            </div>
          </DesktopHeader>
        </>
      )}
      {props.children}
    </div>
  );
}
