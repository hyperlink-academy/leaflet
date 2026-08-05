"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Sidebar, useSidebarStore } from "components/ActionBar/Sidebar";
import { MobileNavigation } from "components/ActionBar/MobileNavigation";
import { ManualNavigation } from "./ManualNavigation";
import { ManualPagination } from "./ManualPagination";
import { findManualPage } from "./nav";

export function ManualShell(props: { children: React.ReactNode }) {
  let { open, setOpen } = useSidebarStore();
  let pathname = usePathname();
  let content = useRef<HTMLDivElement>(null);

  // The scroll container lives in the layout, so it survives navigation
  // between manual pages and would otherwise keep the previous page's offset.
  useEffect(() => {
    content.current?.scrollTo(0, 0);
  }, [pathname]);

  let match = findManualPage(pathname);
  let pageTitle = match?.page?.name ?? match?.section.name ?? "Manual";

  return (
    <div className="manual w-full h-full bg-bg-leaflet">
      <div className="pwa-padding relative max-w-(--breakpoint-lg) w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6">
        <Sidebar alwaysOpen>
          <ManualNavigation />
        </Sidebar>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed z-50 inset-0 bg-primary opacity-60 data-[state=open]:animate-overlayShow" />
            <Dialog.Content className="mobile-sidebar-content fixed z-50 left-0 top-0 h-dvh outline-none">
              <Dialog.Title className="sr-only">Manual navigation</Dialog.Title>
              <Sidebar mobile alwaysOpen className="bg-bg-page!">
                <ManualNavigation onNavigate={() => setOpen(false)} />
              </Sidebar>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <div
          ref={content}
          id="home-content"
          className="manualContent relative w-full h-full flex flex-col gap-3 overflow-y-auto pt-3 px-3 pb-[calc(var(--safe-padding-bottom)+64px)] sm:pt-6 sm:pb-6 sm:pl-8 sm:pr-4"
        >
          <div className="flex flex-col gap-3 max-w-prose w-full">
            {props.children}
            <ManualPagination />
          </div>
          <MobileNavigation pageTitle={pageTitle} />
        </div>
      </div>
    </div>
  );
}
