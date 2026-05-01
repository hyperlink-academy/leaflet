"use client";
import * as Dialog from "@radix-ui/react-dialog";
import {
  DesktopNavigation,
  NavigationContent,
} from "components/ActionBar/DesktopNavigation";
import { Sidebar, useSidebarStore } from "components/ActionBar/Sidebar";
import { DashboardIdContext } from "./dashboardState";

export type DashboardShellProps = {
  id: string;
  pageTitle: React.ReactNode;
  publication?: string;
  actions?: React.ReactNode;
  tabs?: { [name: string]: { href: string; icon?: React.ReactNode } };
  children: React.ReactNode;
};

export function DashboardShell(props: DashboardShellProps) {
  let { id, children, ...navigationProps } = props;
  let { open, setOpen } = useSidebarStore();

  return (
    <DashboardIdContext.Provider value={id}>
      <div
        className={`dashboard pwa-padding relative max-w-(--breakpoint-lg) w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6`}
      >
        <DesktopNavigation {...navigationProps} />
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed z-50 inset-0 bg-primary opacity-60 data-[state=open]:animate-overlayShow" />
            <Dialog.Content
              className="mobile-sidebar-content fixed z-50 left-0 top-0 h-dvh outline-none"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                const interactive = target.closest("a, button");
                if (!interactive) return;
                if (interactive.getAttribute("aria-haspopup")) return;
                setOpen(false);
              }}
            >
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Sidebar
                mobile
                alwaysOpen
                className="my-2! ml-2 h-[calc(100dvh-16px)]! bg-bg-page!"
              >
                <NavigationContent {...navigationProps} />
              </Sidebar>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        {children}
      </div>
    </DashboardIdContext.Provider>
  );
}
