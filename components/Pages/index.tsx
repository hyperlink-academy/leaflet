"use client";

import React, { JSX, useState } from "react";
import { useUIState } from "src/useUIState";
import { useEntitySetContext } from "../EntitySetProvider";
import { useSearchParams } from "next/navigation";

import { focusBlock } from "src/utils/focusBlock";
import { elementId } from "src/utils/elementId";

import { Replicache } from "replicache";
import {
  Fact,
  ReplicacheMutators,
  useEntity,
  useReferenceToEntity,
  useReplicache,
} from "src/replicache";

import { Media } from "../Media";
import { DesktopPageFooter } from "../DesktopFooter";
import { ThemePopover } from "../ThemeManager/ThemeSetter";
import { Canvas } from "../Canvas";
import { DraftPostOptions } from "../Blocks/MailboxBlock";
import { Blocks } from "components/Blocks";
import { MenuItem, Menu } from "../Layout";
import { scanIndex } from "src/replicache/utils";
import { PageThemeSetter } from "../ThemeManager/PageThemeSetter";
import { CardThemeProvider } from "../ThemeManager/ThemeProvider";
import { PageShareMenu } from "./PageShareMenu";
import { scrollIntoViewIfNeeded } from "src/utils/scrollIntoViewIfNeeded";
import { useUndoState } from "src/undoManager";
import { CloseTiny } from "components/Icons/CloseTiny";
import { MoreOptionsTiny } from "components/Icons/MoreOptionsTiny";
import { PaintSmall } from "components/Icons/PaintSmall";
import { ShareSmall } from "components/Icons/ShareSmall";
import { PublicationMetadata } from "./PublicationMetadata";
import { useCardBorderHidden } from "./useCardBorderHidden";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";

export function Pages(props: { rootPage: string }) {
  let rootPage = useEntity(props.rootPage, "root/page")[0];
  let pages = useUIState((s) => s.openPages);
  let params = useSearchParams();
  let queryRoot = params.get("page");
  let firstPage = queryRoot || rootPage?.data.value || props.rootPage;

  return (
    <>
      <div className="flex items-stretch">
        <CardThemeProvider entityID={firstPage}>
          <Page entityID={firstPage} first />
        </CardThemeProvider>
      </div>
      {pages.map((page) => (
        <div className="flex items-stretch" key={page}>
          <CardThemeProvider entityID={page}>
            <Page entityID={page} />
          </CardThemeProvider>
        </div>
      ))}
      <div
        className="spacer"
        style={{ width: `calc(50vw - ((var(--page-width-units)/2))` }}
        onClick={(e) => {
          e.currentTarget === e.target && blurPage();
        }}
      />
    </>
  );
}

export const LeafletOptions = (props: { entityID: string }) => {
  return (
    <>
      <ThemePopover entityID={props.entityID} />
    </>
  );
};

function Page(props: { entityID: string; first?: boolean }) {
  let { rep, rootEntity } = useReplicache();
  let isDraft = useReferenceToEntity("mailbox/draft", props.entityID);

  let isFocused = useUIState((s) => {
    let focusedElement = s.focusedEntity;
    let focusedPageID =
      focusedElement?.entityType === "page"
        ? focusedElement.entityID
        : focusedElement?.parent;
    return focusedPageID === props.entityID;
  });
  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";
  let cardBorderHidden = useCardBorderHidden(props.entityID);
  return (
    <>
      {!props.first && (
        <div
          className="w-6 lg:snap-center"
          onClick={(e) => {
            e.currentTarget === e.target && blurPage();
          }}
        />
      )}
      <div className="pageWrapper w-fit flex relative snap-center">
        <div
          onClick={(e) => {
            if (e.defaultPrevented) return;
            if (rep) {
              if (isFocused) return;
              focusPage(props.entityID, rep);
            }
          }}
          id={elementId.page(props.entityID).container}
          style={{
            width: pageType === "doc" ? "var(--page-width-units)" : undefined,
            backgroundColor: cardBorderHidden
              ? ""
              : "rgba(var(--bg-page), var(--bg-page-alpha))",
          }}
          className={`
            ${pageType === "canvas" ? "!lg:max-w-[1152px]" : "max-w-[var(--page-width-units)]"}
              page
              grow flex flex-col
              overscroll-y-none
              overflow-y-auto
              ${cardBorderHidden ? "border-0 !shadow-none sm:-mt-6 sm:-mb-12 -mt-2 -mb-1 pt-3 " : "border rounded-lg"}
              ${isFocused ? "shadow-md border-border" : "border-border-light"}
            `}
        >
          <Media mobile={true}>
            <PageOptions entityID={props.entityID} first={props.first} />
          </Media>
          <DesktopPageFooter pageID={props.entityID} />
          {isDraft.length > 0 && (
            <div
              className={`pageStatus pt-[6px] pb-1 ${!props.first ? "pr-10 pl-3 sm:px-4" : "px-3 sm:px-4"} border-b border-border text-tertiary`}
              style={{
                backgroundColor:
                  "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
              }}
            >
              <DraftPostOptions mailboxEntity={isDraft[0].entity} />
            </div>
          )}

          <PageContent entityID={props.entityID} />
        </div>
        <Media mobile={false}>
          {isFocused && (
            <PageOptions entityID={props.entityID} first={props.first} />
          )}
        </Media>
      </div>
    </>
  );
}

const PageContent = (props: { entityID: string }) => {
  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";
  if (pageType === "doc") return <DocContent entityID={props.entityID} />;
  return <Canvas entityID={props.entityID} />;
};

const DocContent = (props: { entityID: string }) => {
  let { rootEntity } = useReplicache();
  let isFocused = useUIState((s) => {
    let focusedElement = s.focusedEntity;
    let focusedPageID =
      focusedElement?.entityType === "page"
        ? focusedElement.entityID
        : focusedElement?.parent;
    return focusedPageID === props.entityID;
  });

  let cardBorderHidden = useCardBorderHidden(props.entityID);
  let rootBackgroundImage = useEntity(
    rootEntity,
    "theme/card-background-image",
  );
  let rootBackgroundRepeat = useEntity(
    rootEntity,
    "theme/card-background-image-repeat",
  );
  let rootBackgroundOpacity = useEntity(
    rootEntity,
    "theme/card-background-image-opacity",
  );

  let cardBackgroundImage =
    useEntity(props.entityID, "theme/card-background-image") ||
    rootBackgroundImage;
  let cardBackgroundImageRepeat =
    useEntity(props.entityID, "theme/card-background-image-repeat") ||
    rootBackgroundRepeat;
  let cardBackgroundImageOpacity =
    useEntity(props.entityID, "theme/card-background-image-opacity")?.data
      .value ||
    rootBackgroundOpacity?.data.value ||
    1;

  return (
    <>
      {!cardBorderHidden ? (
        <div
          className={`pageBackground
        absolute top-0 left-0 right-0 bottom-0
        pointer-events-none
        rounded-lg border
        ${isFocused ? " border-border" : "border-border-light"}
        `}
          style={{
            backgroundImage: cardBackgroundImage
              ? `url(${cardBackgroundImage.data.src}), url(${cardBackgroundImage.data.fallback})`
              : undefined,
            backgroundRepeat: cardBackgroundImageRepeat
              ? "repeat"
              : "no-repeat",
            backgroundPosition: "center",
            backgroundSize: !cardBackgroundImageRepeat
              ? "cover"
              : cardBackgroundImageRepeat?.data.value,
            opacity: cardBackgroundImage?.data.src
              ? cardBackgroundImageOpacity
              : 1,
          }}
        />
      ) : null}
      <PublicationMetadata cardBorderHidden={!!cardBorderHidden} />
      <Blocks entityID={props.entityID} />
      {/* we handle page bg in this sepate div so that
    we can apply an opacity the background image
    without affecting the opacity of the rest of the page */}
    </>
  );
};

const PageOptionButton = ({
  children,
  secondary,
  cardBorderHidden,
  className,
  disabled,
  ...props
}: {
  children: React.ReactNode;
  secondary?: boolean;
  cardBorderHidden: boolean | undefined;
  className?: string;
  disabled?: boolean;
} & Omit<JSX.IntrinsicElements["button"], "content">) => {
  return (
    <button
      className={`
        pageOptionsTrigger
        shrink-0
        pt-[2px] h-5 w-5 p-0.5 mx-auto
        border border-border
        ${secondary ? "bg-border text-bg-page" : "bg-bg-page text-border"}
        ${disabled && "opacity-50"}
        ${cardBorderHidden ? "rounded-md" : `rounded-b-md sm:rounded-l-none sm:rounded-r-md`}
        flex items-center justify-center
        ${className}

        `}
      {...props}
    >
      {children}
    </button>
  );
};

const PageOptions = (props: {
  entityID: string;
  first: boolean | undefined;
}) => {
  let { rootEntity } = useReplicache();
  let cardBorderHidden = useCardBorderHidden(props.entityID);

  return (
    <div
      className={`z-10 w-fit absolute  ${cardBorderHidden ? "top-1" : "sm:top-3"} sm:-right-[19px] top-0 right-3 flex sm:flex-col flex-row-reverse gap-1 items-start`}
    >
      {!props.first && (
        <PageOptionButton
          cardBorderHidden={cardBorderHidden}
          secondary
          onClick={() => {
            useUIState.getState().closePage(props.entityID);
          }}
        >
          <CloseTiny />
        </PageOptionButton>
      )}
      <OptionsMenu
        entityID={props.entityID}
        first={!!props.first}
        cardBorderHidden={cardBorderHidden}
      />
      <UndoButtons cardBorderHidden={cardBorderHidden} />
    </div>
  );
};

const UndoButtons = (props: { cardBorderHidden: boolean | undefined }) => {
  let undoState = useUndoState();
  let { undoManager } = useReplicache();
  return (
    <Media mobile>
      {undoState.canUndo && (
        <div className="gap-1 flex sm:flex-col">
          <PageOptionButton
            secondary
            cardBorderHidden={props.cardBorderHidden}
            onClick={() => undoManager.undo()}
          >
            <UndoTiny />
          </PageOptionButton>

          <PageOptionButton
            secondary
            cardBorderHidden={props.cardBorderHidden}
            onClick={() => undoManager.undo()}
            disabled={!undoState.canRedo}
          >
            <RedoTiny />
          </PageOptionButton>
        </div>
      )}
    </Media>
  );
};

const OptionsMenu = (props: {
  entityID: string;
  first: boolean;
  cardBorderHidden: boolean | undefined;
}) => {
  let [state, setState] = useState<"normal" | "theme" | "share">("normal");
  let { permissions } = useEntitySetContext();
  if (!permissions.write) return null;

  let { data: publicationData, mutate } = useLeafletPublicationData();
  let pub = publicationData?.[0];
  if (pub && props.first) return;
  return (
    <Menu
      align="end"
      asChild
      onOpenChange={(open) => {
        if (!open) setState("normal");
      }}
      trigger={
        <PageOptionButton
          cardBorderHidden={props.cardBorderHidden}
          className="!w-8 !h-5 sm:!w-5 sm:!h-8"
        >
          <MoreOptionsTiny className="sm:rotate-90" />
        </PageOptionButton>
      }
    >
      {state === "normal" ? (
        <>
          {!props.first && (
            <MenuItem
              onSelect={(e) => {
                e.preventDefault();
                setState("share");
              }}
            >
              <ShareSmall /> Share Page
            </MenuItem>
          )}
          {!pub && (
            <MenuItem
              onSelect={(e) => {
                e.preventDefault();
                setState("theme");
              }}
            >
              <PaintSmall /> Theme Page
            </MenuItem>
          )}
        </>
      ) : state === "theme" ? (
        <PageThemeSetter entityID={props.entityID} />
      ) : state === "share" ? (
        <PageShareMenu entityID={props.entityID} />
      ) : null}
    </Menu>
  );
};

export async function focusPage(
  pageID: string,
  rep: Replicache<ReplicacheMutators>,
  focusFirstBlock?: "focusFirstBlock",
) {
  // if this page is already focused,
  let focusedBlock = useUIState.getState().focusedEntity;
  // else set this page as focused
  useUIState.setState(() => ({
    focusedEntity: {
      entityType: "page",
      entityID: pageID,
    },
  }));

  setTimeout(async () => {
    //scroll to page

    scrollIntoViewIfNeeded(
      document.getElementById(elementId.page(pageID).container),
      false,
      "smooth",
    );

    // if we asked that the function focus the first block, focus the first block
    if (focusFirstBlock === "focusFirstBlock") {
      let firstBlock = await rep.query(async (tx) => {
        let type = await scanIndex(tx).eav(pageID, "page/type");
        let blocks = await scanIndex(tx).eav(
          pageID,
          type[0]?.data.value === "canvas" ? "canvas/block" : "card/block",
        );

        let firstBlock = blocks[0];

        if (!firstBlock) {
          return null;
        }

        let blockType = (
          await tx
            .scan<
              Fact<"block/type">
            >({ indexName: "eav", prefix: `${firstBlock.data.value}-block/type` })
            .toArray()
        )[0];

        if (!blockType) return null;

        return {
          value: firstBlock.data.value,
          type: blockType.data.value,
          parent: firstBlock.entity,
          position: firstBlock.data.position,
        };
      });

      if (firstBlock) {
        setTimeout(() => {
          focusBlock(firstBlock, { type: "start" });
        }, 500);
      }
    }
  }, 50);
}

const blurPage = () => {
  useUIState.setState(() => ({
    focusedEntity: null,
    selectedBlocks: [],
  }));
};
const UndoTiny = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.98775 3.14543C6.37828 2.75491 6.37828 2.12174 5.98775 1.73122C5.59723 1.34069 4.96407 1.34069 4.57354 1.73122L1.20732 5.09744C0.816798 5.48796 0.816798 6.12113 1.20732 6.51165L4.57354 9.87787C4.96407 10.2684 5.59723 10.2684 5.98775 9.87787C6.37828 9.48735 6.37828 8.85418 5.98775 8.46366L4.32865 6.80456H9.6299C12.1732 6.80456 13.0856 8.27148 13.0856 9.21676C13.0856 9.84525 12.8932 10.5028 12.5318 10.9786C12.1942 11.4232 11.6948 11.7367 10.9386 11.7367H9.43173C8.87944 11.7367 8.43173 12.1844 8.43173 12.7367C8.43173 13.2889 8.87944 13.7367 9.43173 13.7367H10.9386C12.3587 13.7367 13.4328 13.0991 14.1246 12.1883C14.7926 11.3086 15.0856 10.2062 15.0856 9.21676C15.0856 6.92612 13.0205 4.80456 9.6299 4.80456L4.32863 4.80456L5.98775 3.14543Z"
        fill="currentColor"
      />
    </svg>
  );
};

const RedoTiny = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.0122 3.14543C9.62172 2.75491 9.62172 2.12174 10.0122 1.73122C10.4028 1.34069 11.0359 1.34069 11.4265 1.73122L14.7927 5.09744C15.1832 5.48796 15.1832 6.12113 14.7927 6.51165L11.4265 9.87787C11.0359 10.2684 10.4028 10.2684 10.0122 9.87787C9.62172 9.48735 9.62172 8.85418 10.0122 8.46366L11.6713 6.80456H6.3701C3.82678 6.80456 2.91443 8.27148 2.91443 9.21676C2.91443 9.84525 3.10681 10.5028 3.46817 10.9786C3.8058 11.4232 4.30523 11.7367 5.06143 11.7367H6.56827C7.12056 11.7367 7.56827 12.1844 7.56827 12.7367C7.56827 13.2889 7.12056 13.7367 6.56827 13.7367H5.06143C3.6413 13.7367 2.56723 13.0991 1.87544 12.1883C1.20738 11.3086 0.914429 10.2062 0.914429 9.21676C0.914429 6.92612 2.97946 4.80456 6.3701 4.80456L11.6714 4.80456L10.0122 3.14543Z"
        fill="currentColor"
      />
    </svg>
  );
};
