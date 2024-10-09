"use client";
import { useEffect, useState } from "react";
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
import { ShareOptions } from "../ShareOptions";
import { ThemePopover } from "../ThemeManager/ThemeSetter";
import { HomeButton } from "../HomeButton";
import { Canvas } from "../Canvas";
import { DraftPostOptions } from "../Blocks/MailboxBlock";
import { Blocks } from "components/Blocks";

import { Discussion } from "components/Blocks/CommentPanelBlock";
import { MenuItem, Menu } from "../Layout";
import {
  MoreOptionsTiny,
  DeleteSmall,
  CloseTiny,
  PaintSmall,
  ShareSmall,
} from "../Icons";
import { HelpPopover } from "../HelpPopover";
import { CreateNewLeafletButton } from "app/home/CreateNewButton";
import { scanIndex } from "src/replicache/utils";
import { PageThemeSetter } from "../ThemeManager/PageThemeSetter";
import { CardThemeProvider } from "../ThemeManager/ThemeProvider";
import { PageShareMenu } from "./PageShareMenu";

export function Pages(props: { rootPage: string }) {
  let rootPage = useEntity(props.rootPage, "root/page")[0];
  let pages = useUIState((s) => s.openPages);
  let params = useSearchParams();
  let queryRoot = params.get("page");
  let firstPage = queryRoot || rootPage?.data.value || props.rootPage;
  let entity_set = useEntitySetContext();

  return (
    <div
      id="pages"
      className="pages flex pt-2 pb-1 sm:pb-8 sm:py-6"
      onClick={(e) => {
        e.currentTarget === e.target && blurPage();
      }}
    >
      <div
        className="spacer flex justify-end items-start"
        style={{ width: `calc(50vw - ((var(--page-width-units)/2))` }}
        onClick={(e) => {
          e.currentTarget === e.target && blurPage();
        }}
      >
        <Media mobile={false} className="h-full">
          <div className="flex flex-col h-full justify-between mr-4 mt-1">
            {entity_set.permissions.write ? (
              <div className="flex flex-col justify-center gap-2 ">
                <ShareOptions rootEntity={props.rootPage} />
                <LeafletOptions entityID={props.rootPage} />
                <CreateNewLeafletButton />
                <HelpPopover />
                <hr className="text-border my-3" />
                <HomeButton />
              </div>
            ) : (
              <div>
                {" "}
                <HomeButton />{" "}
              </div>
            )}
          </div>
        </Media>
      </div>
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
    </div>
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
  let { rep } = useReplicache();
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
      {/* // pageWrapper is required so that items absolutely positioned items on the page border
      (like canvasWidthHandle) can overflow the page itself */}
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
            backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
            width:
              pageType === "canvas" ? undefined : "var(--page-width-units)",
          }}
          className={`
            ${pageType === "canvas" ? "!lg:max-w-[1152px]" : "max-w-[var(--page-width-units)]"}
              page
              grow flex flex-col
              overscroll-y-none
              overflow-y-scroll no-scrollbar
              rounded-lg border
              ${isFocused ? "shadow-md border-border" : "border-border-light"}
            `}
        >
          <Media mobile={true}>
            <PageOptionsMenu entityID={props.entityID} first={props.first} />
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
            <PageOptionsMenu entityID={props.entityID} first={props.first} />
          )}
        </Media>
      </div>
    </>
  );
}

const PageContent = (props: { entityID: string }) => {
  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";
  if (pageType === "doc") return <DocContent entityID={props.entityID} />;
  if (pageType === "discussion")
    return <Discussion entityID={props.entityID} />;
  if (pageType === "canvas") return <Canvas entityID={props.entityID} />;
  return null;
};

const DocContent = (props: { entityID: string }) => {
  let isFocused = useUIState((s) => {
    let focusedElement = s.focusedEntity;
    let focusedPageID =
      focusedElement?.entityType === "page"
        ? focusedElement.entityID
        : focusedElement?.parent;
    return focusedPageID === props.entityID;
  });
  let cardBackgroundImage = useEntity(
    props.entityID,
    "theme/card-background-image",
  );
  let cardBackgroundImageRepeat = useEntity(
    props.entityID,
    "theme/card-background-image-repeat",
  );
  let cardBackgroundImageOpacity =
    useEntity(props.entityID, "theme/card-background-image-opacity")?.data
      .value || 1;
  return (
    <>
      <div
        className={`pageBackground
        absolute top-0 left-0 right-0 bottom-0
        pointer-events-none
        rounded-lg border
        ${isFocused ? " border-border" : "border-border-light"}
        `}
        style={{
          backgroundImage: `url(${cardBackgroundImage?.data.src}), url(${cardBackgroundImage?.data.fallback})`,
          backgroundRepeat: cardBackgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundPosition: "center",
          backgroundSize: !cardBackgroundImageRepeat
            ? "cover"
            : cardBackgroundImageRepeat?.data.value,
          opacity: cardBackgroundImage?.data.src
            ? cardBackgroundImageOpacity
            : 1,
        }}
      />
      <Blocks entityID={props.entityID} />
      {/* we handle page bg in this sepate div so that
    we can apply an opacity the background image
    without affecting the opacity of the rest of the page */}
    </>
  );
};

const PageOptionsMenu = (props: {
  entityID: string;
  first: boolean | undefined;
}) => {
  return (
    <div className=" z-10 w-fit absolute sm:top-3 sm:-right-[19px] top-0 right-3 flex sm:flex-col flex-row-reverse gap-1 items-start">
      {!props.first && (
        <button
          className="pt-[2px] h-5 w-5 p-0.5 mx-auto bg-border text-bg-page sm:rounded-r-md sm:rounded-l-none rounded-b-md hover:bg-accent-1 hover:text-accent-2"
          onClick={() => {
            useUIState.getState().closePage(props.entityID);
          }}
        >
          <CloseTiny />
        </button>
      )}
      {<OptionsMenu entityID={props.entityID} first={!!props.first} />}
    </div>
  );
};

const OptionsMenu = (props: { entityID: string; first: boolean }) => {
  let [state, setState] = useState<"normal" | "theme" | "share">("normal");
  let { permissions } = useEntitySetContext();
  if (!permissions.write) return null;
  return (
    <Menu
      align="end"
      onOpenChange={(open) => {
        if (!open) setState("normal");
      }}
      trigger={
        <div
          className={`pageOptionsTrigger
          shrink-0 sm:h-8 sm:w-5 h-5 w-8
          bg-bg-page text-border
          outline-none border sm:border-l-0 border-t-1 border-border sm:rounded-r-md sm:rounded-l-none rounded-b-md
          hover:shadow-[0_1px_0_theme(colors.border)_inset,_0_-1px_0_theme(colors.border)_inset,_-1px_0_0_theme(colors.border)_inset]
          flex items-center justify-center`}
        >
          <MoreOptionsTiny className="sm:rotate-90" />
        </div>
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
          <MenuItem
            onSelect={(e) => {
              e.preventDefault();
              setState("theme");
            }}
          >
            <PaintSmall /> Theme Page
          </MenuItem>
        </>
      ) : state === "theme" ? (
        <PageThemeSetter entityID={props.entityID} />
      ) : state === "share" ? (
        <PageShareMenu entityID={props.entityID} />
      ) : null}
    </Menu>
  );
};

const PageMenuItem = (props: {
  children: React.ReactNode;
  onClick: () => void;
}) => {
  return (
    <button
      className="pageOptionsMenuItem z-10 text-left text-secondary py-1 px-2 flex gap-2 hover:bg-accent-1 hover:text-accent-2"
      onClick={() => {
        props.onClick();
      }}
    >
      {props.children}
    </button>
  );
};

const DeletePageToast = {
  content: (
    <div className="flex gap-2">
      You deleted a page.{" "}
      <button
        className="underline font-bold sm:font-normal sm:hover:font-bold italic"
        onClick={() => {
          // TODO: WIRE UP UNDO DELETE
        }}
      >
        Undo?
      </button>
    </div>
  ),
  type: "info",
  duration: 5000,
} as const;

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
    document.getElementById(elementId.page(pageID).container)?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
    });

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
