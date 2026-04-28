"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MediaContents } from "components/Media";
import { Separator } from "components/Layout";
import { SearchSmall } from "components/Icons/SearchSmall";
import { MenuSmall } from "components/Icons/MenuSmall";
import { AccountSmall } from "components/Icons/AccountSmall";
import { CloseTiny } from "components/Icons/CloseTiny";
import { Sidebar } from "./Sidebar";
import {
  WriterButton,
  ReaderButton,
  NotificationButton,
} from "./NavigationButtons";
import { PublicationButtons } from "./Publications";
import { ProfileButton } from "./ProfileButton";
import { ActionButton } from "./ActionButton";
import { LoginModal } from "components/LoginButton";
import { useIdentityData } from "components/IdentityProvider";
import { SearchTiny } from "components/Icons/SearchTiny";

export const MobileNavigation = (props: {
  controls?: React.ReactNode;
  actions?: React.ReactNode;
}) => {
  let [state, setState] = useState<"search" | "default">("default");
  return (
    <MediaContents
      mobile={true}
      className="mobilePageHeader container flex gap-4 justify-between items-center p-1  w-full "
    >
      {props.controls && state === "search" ? (
        <>
          {props.controls}
          <Separator classname="h-6" />
          <button
            onClick={() => {
              setState("default");
            }}
          >
            <CloseTiny />
          </button>
        </>
      ) : (
        <>
          <MobileSidebar />
          <div className="flex-1" />
          <button
            onClick={() => {
              setState("search");
            }}
          >
            <SearchTiny />
          </button>
          <div className="flex flex-row-reverse! gap-1">{props.actions}</div>
        </>
      )}
    </MediaContents>
  );
};

const MobileSidebar = () => {
  let { identity } = useIdentityData();
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="flex gap-1 items-center text-secondary font-bold">
          <MenuSmall />
          Home
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed z-50 inset-0 bg-primary opacity-60 data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="mobile-sidebar-content fixed z-50 left-0 top-0 h-dvh outline-none">
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <Sidebar
            mobile
            alwaysOpen
            className="my-2! ml-2 h-[calc(100dvh-16px)]! bg-bg-page!"
          >
            <div className="text-tertiary uppercase text-sm px-1">
              PUBLICATIONS
            </div>
            <PublicationButtons currentPage="home" />

            <div className="flex-1" />
            <WriterButton />
            <ReaderButton
              subs={
                identity?.publication_subscriptions?.length !== 0 &&
                identity?.publication_subscriptions?.length !== undefined
              }
            />
            {identity?.atp_did && <NotificationButton />}
            {identity ? (
              <>
                <hr className="border-border-light my-1" />
                <ProfileButton />
              </>
            ) : (
              <LoginModal
                asChild
                trigger={
                  <ActionButton
                    secondary
                    icon={<AccountSmall />}
                    label="Log In/Sign Up"
                  />
                }
              />
            )}
          </Sidebar>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
