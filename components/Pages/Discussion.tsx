import { Root } from "@radix-ui/react-dropdown-menu";
import { createNewLeaflet } from "actions/createNewLeaflet";
import { submitComment } from "actions/submitComment";
import { Blocks } from "components/Blocks";
import { Block } from "components/Blocks/Block";
import { ButtonPrimary } from "components/Buttons";
import {
  EntitySetContext,
  EntitySetProvider,
} from "components/EntitySetProvider";
import { useState } from "react";
import { useSubscribe } from "replicache-react";
import { useBlocks } from "src/hooks/queries/useBlocks";
import {
  PermissionToken,
  ReplicacheProvider,
  useEntity,
  useReplicache,
} from "src/replicache";
import { scanIndex } from "src/replicache/utils";
import { useUIState } from "src/useUIState";
import useSWR from "swr";
import { v7 } from "uuid";

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
  return (
    <div className="discussion relative sm:p-4 p-3 w-full h-full text-sm text-secondary flex flex-col justify-between">
      <div className="flex flex-col gap-2">
        {messages.map((m) => (
          <Message key={m.entityID} {...m} />
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

const Message = (props: {
  sender: string;
  entityID: string;
  created_at: string;
}) => {
  return (
    <div className="flex flex-col border min-h">
      <div className=" flex flex-row gap-2">
        <div className="text-tertiary font-bold">{props.sender}</div>
        <div className="text-tertiary font-bold">{props.created_at}</div>
      </div>
      <MessageContents entityID={props.entityID} preview />
    </div>
  );
};

const MessageComposer = (props: { entityID: string; onSubmit: () => void }) => {
  let key = `message-draft-${props.entityID}`;
  let { rootEntity } = useReplicache();
  let { data: leafletDraft, mutate } = useSWR(key, (key) => {
    let data = localStorage.getItem(key);
    if (data) return JSON.parse(data) as PermissionToken;
    return null;
  });
  let [username, setUsername] = useState("");
  if (leafletDraft === undefined) return "loading";
  if (leafletDraft === null)
    return (
      <ButtonPrimary
        onClick={async () => {
          let newToken = await createNewLeaflet("doc", false);
          localStorage.setItem(key, JSON.stringify(newToken));
          mutate();
        }}
      >
        Reply
      </ButtonPrimary>
    );
  console.log(leafletDraft);
  return (
    <ReplicacheProvider
      token={leafletDraft}
      initialFacts={[]}
      name={leafletDraft.id}
      rootEntity={leafletDraft.root_entity}
    >
      <EntitySetProvider
        set={leafletDraft.permission_token_rights[0].entity_set}
      >
        <div>
          <MessageContents
            entityID={leafletDraft.root_entity}
            preview={false}
          />
          <button
            onClick={async () => {
              await submitComment(leafletDraft, props.entityID, rootEntity);
              props.onSubmit();
            }}
          >
            send!
          </button>
        </div>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
};

let MessageContents = (props: { entityID: string; preview: boolean }) => {
  let firstPage = useEntity(props.entityID, "root/page")[0];
  let parent = firstPage?.data.value || props.entityID;
  let blocks = useBlocks(parent);

  return (
    <div className="border h-min">
      {blocks.map((f, index, arr) => {
        let nextBlock = arr[index + 1];
        let depth = f.listData?.depth || 1;
        let nextDepth = nextBlock?.listData?.depth || 1;
        let nextPosition: string | null;
        if (depth === nextDepth) nextPosition = nextBlock?.position || null;
        else nextPosition = null;
        return (
          <Block
            preview={props.preview}
            pageType="doc"
            {...f}
            key={f.value}
            entityID={f.value}
            parent={parent}
            previousBlock={arr[index - 1] || null}
            nextBlock={arr[index + 1] || null}
            nextPosition={nextPosition}
          />
        );
      })}
    </div>
  );
};
