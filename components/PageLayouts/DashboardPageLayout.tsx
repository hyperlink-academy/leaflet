"use client";
import { Header } from "../PageHeader";
import { MediaContents } from "components/Media";
import { usePreserveScroll } from "src/hooks/usePreserveScroll";

export const PageTitle = (props: {
  pageTitle: string;
  actions: React.ReactNode;
}) => {
  return (
    <MediaContents
      mobile={true}
      className="flex justify-between items-center px-1 mt-1 -mb-1 w-full "
    >
      <h4 className="grow truncate">{props.pageTitle}</h4>
      <div className="flex flex-row-reverse! gap-1">{props.actions}</div>
    </MediaContents>
  );
};

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
      {props.pageTitle && (
        <PageTitle pageTitle={props.pageTitle} actions={props.actions} />
      )}
      {props.showHeader && (
        <Header>
          <div className={`sm:block ${props.publication && "hidden"} grow`}>
            {props.controls}
          </div>
        </Header>
      )}
      {props.children}
    </div>
  );
}
