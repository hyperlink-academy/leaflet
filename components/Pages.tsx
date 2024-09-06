"use client";
import { useUIState } from "src/useUIState";
import { Blocks } from "components/Blocks";
import { focusBlock } from "src/utils/focusBlock";
import useMeasure from "react-use-measure";
import { elementId } from "src/utils/elementId";
import { ThemePopover } from "./ThemeManager/ThemeSetter";
import { Media } from "./Media";
import { DesktopPageFooter } from "./DesktopFooter";
import { Replicache } from "replicache";
import {
  Fact,
  ReplicacheMutators,
  useEntity,
  useReferenceToEntity,
  useReplicache,
} from "src/replicache";
import * as Popover from "@radix-ui/react-popover";
import { MoreOptionsTiny, DeleteSmall, CloseTiny, PopoverArrow } from "./Icons";
import { useToaster } from "./Toast";
import { ShareOptions } from "./ShareOptions";
import { MenuItem, Menu } from "./Layout";
import { useEntitySetContext } from "./EntitySetProvider";
import { HomeButton } from "./HomeButton";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { DraftPostOptions } from "./Blocks/MailboxBlock";
import { useIsMobile } from "src/hooks/isMobile";
import { Canvas } from "./Canvas";

export function Pages(props: { rootPage: string }) {
  let openPages = useUIState((s) => s.openPages);
  let params = useSearchParams();
  let openPage = params.get("openPage");
  useEffect(() => {
    if (openPage) {
    }
  }, [openPage, props.rootPage]);
  let pages = [...openPages];
  if (openPage && !pages.includes(openPage)) pages.push(openPage);

  return (
    <div
      id="pages"
      className="pages flex pt-2 pb-8 sm:py-6"
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
            <div className="flex flex-col justify-center gap-2 ">
              <ShareOptions rootEntity={props.rootPage} />
              <LeafletOptions entityID={props.rootPage} />
              <hr className="text-border my-3" />
              <HomeButton />
            </div>
          </div>
        </Media>
      </div>
      <div className="flex items-stretch">
        <Page entityID={props.rootPage} first />
      </div>
      {pages.map((page) => (
        <div className="flex items-stretch" key={page}>
          <Page entityID={page} />
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

  let focusedElement = useUIState((s) => s.focusedEntity);
  let focusedPageID =
    focusedElement?.entityType === "page"
      ? focusedElement.entityID
      : focusedElement?.parent;
  let isFocused = focusedPageID === props.entityID;
  let isMobile = useIsMobile();
  let type = useEntity(props.entityID, "page/type")?.data.value || "doc";

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
          onMouseDown={(e) => {
            if (e.defaultPrevented) return;
            if (!isMobile) return;
            if (rep) {
              focusPage(props.entityID, rep);
            }
          }}
          id={elementId.page(props.entityID).container}
          style={{
            backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
            width: type === "doc" ? "var(--page-width-units)" : undefined,
          }}
          className={`
            ${type === "canvas" ? "!lg:max-w-[1152px]" : "max-w-[var(--page-width-units)]"}
      page
      grow flex flex-col
      overscroll-y-none
      overflow-y-scroll no-scrollbar
      rounded-lg border
      ${isFocused ? "shadow-md border-border" : "border-border-light"}
    `}
        >
          <Media mobile={true}>
            {!props.first && <PageOptionsMenu entityID={props.entityID} />}
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
          {isFocused && !props.first && (
            <PageOptionsMenu entityID={props.entityID} />
          )}
        </Media>
      </div>
    </>
  );
}

const PageContent = (props: { entityID: string }) => {
  let type = useEntity(props.entityID, "page/type")?.data.value || "doc";
  let { rep } = useReplicache();
  if (type === "doc")
    return (
      <div>
        <button
          onClick={() => {
            rep?.mutate.assertFact({
              entity: props.entityID,
              attribute: "page/type",
              data: { type: "page-type-union", value: "canvas" },
            });
          }}
        >
          make canvas lmao
        </button>
        <Blocks entityID={props.entityID} />
      </div>
    );
  return <Canvas entityID={props.entityID} />;
};

const PageOptionsMenu = (props: { entityID: string }) => {
  let permission = useEntitySetContext().permissions.write;
  return (
    <div className=" z-10 w-fit absolute sm:top-2 sm:-right-[18px] top-0 right-3 flex sm:flex-col flex-row-reverse gap-1 items-start">
      <button
        className="p-1 pt-[10px] sm:p-0.5 sm:pl-0 bg-border text-bg-page sm:rounded-r-md sm:rounded-l-none rounded-b-md hover:bg-accent-1 hover:text-accent-2"
        onClick={() => {
          useUIState.getState().closePage(props.entityID);
        }}
      >
        <CloseTiny />
      </button>
      {/* {permission && <OptionsMenu/>} */}
    </div>
  );
};

const OptionsMenu = () => {
  let toaster = useToaster();
  return (
    <Menu
      trigger={
        <div
          className={`pageOptionsTrigger
      shrink-0 sm:h-8 sm:w-5 h-5 w-8
      bg-bg-page text-border
      border sm:border-l-0 border-t-1 border-border sm:rounded-r-md sm:rounded-l-none rounded-b-md
      sm:hover:border-r-2 hover:border-b-2 hover:border-y-2 hover:border-t-1
      flex items-center justify-center`}
        >
          <MoreOptionsTiny className="sm:rotate-90" />
        </div>
      }
    >
      <MenuItem
        onSelect={(e) => {
          // TODO: Wire up delete page
          toaster(DeletePageToast);
        }}
      >
        Delete Page <DeleteSmall />
      </MenuItem>
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
  if (
    (focusedBlock?.entityType == "page" && focusedBlock.entityID === pageID) ||
    (focusedBlock?.entityType === "block" && focusedBlock.parent === pageID)
  )
    return;
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
        let blocks = await tx
          .scan<
            Fact<"card/block">
          >({ indexName: "eav", prefix: `${pageID}-page/block` })
          .toArray();

        let firstBlock = blocks.sort((a, b) => {
          return a.data.position > b.data.position ? 1 : -1;
        })[0];

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
