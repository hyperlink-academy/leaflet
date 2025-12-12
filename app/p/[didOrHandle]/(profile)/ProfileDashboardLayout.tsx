"use client";

import { Actions } from "app/(home-pages)/home/Actions/Actions";
import { Footer } from "components/ActionBar/Footer";
import { Sidebar } from "components/ActionBar/Sidebar";
import {
  DesktopNavigation,
  MobileNavigation,
} from "components/ActionBar/Navigation";
import { MediaContents } from "components/Media";
import { Separator } from "components/Layout";

export function ProfileDashboardLayout(props: {
  did: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`dashboard pwa-padding relative max-w-(--breakpoint-lg) w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6`}
    >
      <MediaContents mobile={false}>
        <div className="flex flex-col gap-3 my-6">
          <DesktopNavigation currentPage="home" />
          <Sidebar alwaysOpen>
            <Actions />
          </Sidebar>
        </div>
      </MediaContents>
      <div
        className={`w-full h-full flex flex-col gap-2 relative overflow-y-scroll pt-3 pb-12 px-3 sm:pt-8 sm:pb-12 sm:pl-6 sm:pr-4`}
        id="home-content"
      >
        {props.children}
      </div>
      <Footer>
        <MobileNavigation currentPage="home" />
        <Separator />
        <Actions />
      </Footer>
    </div>
  );
}
