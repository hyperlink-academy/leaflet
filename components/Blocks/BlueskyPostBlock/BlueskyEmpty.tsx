import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { BlockProps } from "../Block";
import { v7 } from "uuid";
import { useSmoker } from "components/Toast";
import { BlockBlueskySmall, CheckTiny } from "components/Icons";
import { Separator } from "components/Layout";
import { Input } from "components/Input";
import { isUrl } from "src/utils/isURL";
import { AppBskyFeedDefs, AtpAgent } from "@atproto/api";
import { addBlueskyPostBlock } from "src/utils/addLinkBlock";

export const BlueskyPostEmpty = (props: BlockProps) => {
  let { rep } = useReplicache();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let isLocked = useEntity(props.entityID, "block/is-locked")?.data.value;

  let entity_set = useEntitySetContext();
  let [urlValue, setUrlValue] = useState("");

  let submit = async () => {
    if (!rep) return;
    let entity = props.entityID;

    let blueskyPostBlock = await addBlueskyPostBlock(urlValue, entity, rep);
    if (blueskyPostBlock === false) {
      let rect = document
        .getElementById("bluesky-post-block-submit")
        ?.getBoundingClientRect();
      smoker({
        error: true,
        text: "post not found!",
        position: {
          x: (rect && rect.left + 12) || 0,
          y: (rect && rect.top) || 0,
        },
      });
    }
  };
  let smoker = useSmoker();
  function errorSmokers(x: number, y: number) {
    if (!urlValue || urlValue === "") {
      smoker({
        error: true,
        text: "no url!",
        position: {
          x: x,
          y: y,
        },
      });
      return;
    }
    if (!isUrl(urlValue) || !urlValue.includes("bsky.app")) {
      smoker({
        error: true,
        text: "invalid bluesky url!",
        position: {
          x: x,
          y: y,
        },
      });
      return;
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        let rect = document
          .getElementById("bluesky-post-block-submit")
          ?.getBoundingClientRect();

        rect && errorSmokers(rect.left + 12, rect.top);
        submit();
      }}
    >
      <div className={`max-w-sm flex gap-2 rounded-md text-secondary`}>
        {/* TODO: bsky icon? */}
        <BlockBlueskySmall
          className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
        />
        <Separator />
        <Input
          type="text"
          className="w-full grow border-none outline-none bg-transparent "
          placeholder="bsky.app/post-url"
          value={urlValue}
          disabled={isLocked}
          onChange={(e) => setUrlValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submit();
            }
            if (
              e.key === "Backspace" &&
              !e.currentTarget.value &&
              urlValue !== ""
            ) {
              e.preventDefault();
              console.log("hello!");
            }
          }}
        />
        <button
          type="submit"
          id="bluesky-post-block-submit"
          className={`p-1 ${isSelected && !isLocked ? "text-accent-contrast" : "text-border"}`}
          onMouseDown={(e) => {
            e.preventDefault();
            errorSmokers(e.clientX + 12, e.clientY);
            submit();
          }}
        >
          <CheckTiny />
        </button>
      </div>
    </form>
  );
};
