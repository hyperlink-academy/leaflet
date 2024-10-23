import { borderStyles } from "app/borderTest/borderStyles";
import { Block } from "components/Blocks/Block";
import { PaintSmall } from "components/Icons";
import { Popover } from "components/Popover";
import React, { useState } from "react";
import { useSubscribe } from "replicache-react";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity, useReplicache } from "src/replicache";
import { scanIndex } from "src/replicache/utils";
import { MessageComposer } from "./MessageComposer";
import { theme } from "tailwind.config";

type Message = {
  id: string;
  sender: string;
  created_at: string;
  contents: string;
};
export const Discussion = (props: { entityID: string }) => {
  let { rep } = useReplicache();
  let messages =
    useSubscribe(rep, async (tx) => {
      let scan = scanIndex(tx);
      let messages = await scan.eav(props.entityID, "discussion/reply");
      return Promise.all(
        messages.map(async (m) => {
          let [timestamp] = await scan.eav(m.data.value, "reply/created-at");
          let [sender] = await scan.eav(m.data.value, "reply/sender");
          return {
            entityID: m.data.value,
            sender: sender?.data.value || "Anonymous",
            created_at: timestamp?.data.value || new Date().toISOString(),
          };
        }),
      );
    }) || [];

  let [messagesScrollPos, setMessagesScrollPos] = useState<number>(0);
  let [discussionName, setDiscussionName] = useState<string>("");

  return (
    <div className="discussion w-full h-full text-sm text-secondary flex flex-col items-stretch">
      <input
        type="text"
        value={discussionName}
        onChange={(e) => setDiscussionName(e.currentTarget.value)}
        placeholder="Discussion"
        className="sm:px-4 px-3 pt-3 font-bold text-lg bg-transparent outline-none"
        style={
          messagesScrollPos > 10
            ? {
                fontSize: theme.fontSize["sm"],
                paddingBottom: "0.25rem",
              }
            : { fontSize: theme.fontSize["lg"], paddingBottom: "1rem" }
        }
      />
      {messagesScrollPos > 10 && (
        <hr className="w-full border-border-light sm:mx-4 mx-3" />
      )}

      <div
        className="no-scrollbar grow flex flex-col gap-8 overflow-y-scroll pb-8 pt-3"
        id={`messages-${props.entityID}`}
        onScroll={(e) => {
          setMessagesScrollPos(e.currentTarget.scrollTop);
        }}
      >
        {messages.map((m) => (
          <div key={m.entityID} className="sm:px-4 px-3">
            {" "}
            <Message {...m} borderStyle="default" />
          </div>
        ))}
      </div>
      <MessageComposer
        entityID={props.entityID}
        onSubmit={() => {
          rep?.pull();
        }}
      />
    </div>
  );
};

export const MessageContents = (props: {
  entityID: string;
  preview: boolean;
}) => {
  let firstPage = useEntity(props.entityID, "root/page")[0];
  let parent = firstPage?.data.value || props.entityID;
  let blocks = useBlocks(parent);

  return (
    <div
      className="messageContent
          py-2 w-full 
          text-sm text-primary"
    >
      {blocks.map((f, index, arr) => {
        let nextBlock = arr[index + 1];
        let depth = f.listData?.depth || 1;
        let nextDepth = nextBlock?.listData?.depth || 1;
        let nextPosition: string | null;
        if (depth === nextDepth) nextPosition = nextBlock?.position || null;
        else nextPosition = null;
        return (
          <div className="-mb-1" key={f.value}>
            <Block
              preview={props.preview}
              pageType="doc"
              {...f}
              entityID={f.value}
              parent={parent}
              previousBlock={arr[index - 1] || null}
              nextBlock={arr[index + 1] || null}
              nextPosition={nextPosition}
            />
          </div>
        );
      })}
    </div>
  );
};

const Message = (props: {
  sender: string;
  entityID: string;
  created_at: string;
  borderStyle: keyof typeof borderStyles;
}) => {
  let selectedSytle = borderStyles[props.borderStyle];
  let date = new Date(props.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="message relative w-full h-full" style={selectedSytle}>
      <div
        className={`
          messageAuthor
          py-0.5 px-2 absolute -top-3 left-2 
          flex gap-2 items-baseline
          text-tertiary text-sm font-bold italic 
          bg-bg-page  rounded-full
          ${props.borderStyle === "none" ? "" : "border border-border "}`}
      >
        <div className="text-tertiary font-bold">{props.sender}</div>
        <div className="text-xs italic text-tertiary font-normal shrink-0">
          {date}
        </div>
      </div>
      <MessageContents entityID={props.entityID} preview />
    </div>
  );
};
