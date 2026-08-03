"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DesktopNavigation,
  NavigationContent,
} from "components/ActionBar/DesktopNavigation";
import { Sidebar, useSidebarStore } from "components/ActionBar/Sidebar";
import { DashboardIdContext } from "./dashboardState";
import { NotificationContent } from "./NotificationContent";

type DashboardShellProps = {
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
  // Each route-group layout renders its own shell, so navigating between them
  // remounts this dialog while `open` persists in the module-level store. A
  // mount that starts out open is that carry-over, not the user opening the
  // sidebar — suppress the slide-in/overlay animations so the sidebar reads
  // as continuously open across the navigation.
  let [suppressOpenAnimation, setSuppressOpenAnimation] = useState(open);
  useEffect(() => {
    if (!open) setSuppressOpenAnimation(false);
  }, [open]);
  let searchParams = useSearchParams();
  let showNotifications = searchParams.get("notifications") === "open";

  return (
    <DashboardIdContext.Provider value={id}>
      <div
        className={`dashboard pwa-padding relative max-w-(--breakpoint-lg) w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6`}
      >
        <DesktopNavigation {...navigationProps} />
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Portal>
            <Dialog.Overlay
              className={`fixed z-50 inset-0 bg-primary opacity-60 ${suppressOpenAnimation ? "" : "data-[state=open]:animate-overlayShow"}`}
            />
            <Dialog.Content
              className={`mobile-sidebar-content ${suppressOpenAnimation ? "mobile-sidebar-skip-open-anim" : ""} fixed z-50 left-0 top-0 h-dvh outline-none`}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                // Clicks inside portaled layers (popovers, modals) bubble here
                // through the React tree even though their DOM lives outside the
                // sidebar — ignore them so opening a modal from a menu doesn't
                // close (and unmount) the sidebar out from under it.
                if (!e.currentTarget.contains(target)) return;
                const interactive = target.closest("a, button");
                if (!interactive) return;
                if (interactive.getAttribute("aria-haspopup")) return;
                // Navigation links keep the sidebar open — it's the hub for
                // hopping between dashboards, and its open state (module-level
                // store) is meant to survive route changes. Only non-link
                // actions dismiss it. closest("a"), not a tagName check: the
                // nav links render a button INSIDE the anchor (SpeedyLink >
                // ActionButton), so the innermost interactive element is a
                // button even for navigations.
                if (interactive.closest("a")) return;
                setOpen(false);
              }}
            >
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Sidebar mobile alwaysOpen className="bg-bg-page!">
                <NavigationContent {...navigationProps} />
              </Sidebar>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        {showNotifications ? <NotificationContent /> : children}
      </div>
    </DashboardIdContext.Provider>
  );
}
