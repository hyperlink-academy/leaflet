"use client";
import { useRef, useState } from "react";
import { createPublicationDraft } from "actions/createPublicationDraft";
import { ActionButton } from "components/ActionBar/ActionButton";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { AddTiny } from "components/Icons/AddTiny";
import { BlockCanvasPageSmall } from "components/Icons/BlockCanvasPageSmall";
import { BlockDocPageSmall } from "components/Icons/BlockDocPageSmall";
import { Menu, MenuItem } from "components/Menu";
import { useRouter } from "next/navigation";
import { useIsMobile } from "src/hooks/isMobile";
import { DotLoader } from "components/utils/DotLoader";

function useCreateDraft(publication: string, options?: { emailOnly: true }) {
  let router = useRouter();

  let inFlight = useRef(false);
  let [creating, setCreating] = useState(false);
  let createDraft = async (pageType?: "doc" | "canvas") => {
    if (inFlight.current) return;
    inFlight.current = true;
    setCreating(true);
    try {
      let newLeaflet = await createPublicationDraft(
        publication,
        pageType,
        options,
      );
      if (newLeaflet) return router.push(`/${newLeaflet}`);
    } catch (e) {
      console.error(e);
    }
    inFlight.current = false;
    setCreating(false);
  };
  return { createDraft, creating };
}

export function NewDraftButton(props: {
  publication: string;
  type?: "primary" | "secondary" | "tertiary";
  children: React.ReactNode;
}) {
  let { createDraft, creating } = useCreateDraft(props.publication);
  let Button = {
    primary: ButtonPrimary,
    secondary: ButtonSecondary,
    tertiary: ButtonTertiary,
  }[props.type ?? "primary"];
  return (
    <Button disabled={creating} onClick={() => createDraft()}>
      {creating ? <DotLoader /> : props.children}
    </Button>
  );
}

// Starts an email-only draft, which goes out through the email send flow
// rather than being published.
export function NewEmailButton(props: {
  publication: string;
  compact?: boolean;
}) {
  let { createDraft, creating } = useCreateDraft(props.publication, {
    emailOnly: true,
  });
  return (
    <ButtonPrimary
      compact={props.compact}
      className={props.compact ? "text-sm!" : undefined}
      disabled={creating}
      onClick={() => createDraft("doc")}
    >
      {creating ? (
        <DotLoader />
      ) : (
        <>
          <AddTiny className="scale-90" /> Email
        </>
      )}
    </ButtonPrimary>
  );
}

export function NewDraftActionButton(props: {
  publication: string;
  compact?: boolean;
}) {
  let isMobile = useIsMobile();
  let { createDraft } = useCreateDraft(props.publication);

  return (
    <Menu
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="z-[60]!"
      trigger={
        props.compact ? (
          <ButtonPrimary compact className="text-sm!">
            <AddTiny className="scale-90" /> Draft
          </ButtonPrimary>
        ) : (
          <ActionButton
            id="new-leaflet-button"
            primary
            icon=<AddTiny className="m-1" />
            className="w-full"
            label="Draft"
          />
        )
      }
    >
      <MenuItem onSelect={() => createDraft("doc")}>
        <BlockDocPageSmall />{" "}
        <div className="flex flex-col">
          <div>New Doc</div>
          <div className="text-tertiary text-sm font-normal">
            A good ol&apos; text document
          </div>
        </div>
      </MenuItem>
      <MenuItem onSelect={() => createDraft("canvas")}>
        <BlockCanvasPageSmall />
        <div className="flex flex-col">
          New Canvas
          <div className="text-tertiary text-sm font-normal">
            A digital whiteboard
          </div>
        </div>
      </MenuItem>
    </Menu>
  );
}
