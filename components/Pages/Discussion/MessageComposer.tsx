import { createNewLeaflet } from "actions/createNewLeaflet";
import { submitComment } from "actions/submitComment";
import { borderStyles } from "app/borderTest/borderStyles";
import { ButtonPrimary } from "components/Buttons";
import { EntitySetProvider } from "components/EntitySetProvider";
import { PaintSmall } from "components/Icons";
import { Popover } from "components/Popover";
import React, { useEffect, useRef } from "react";
import { useState } from "react";
import {
  PermissionToken,
  ReplicacheProvider,
  useReplicache,
} from "src/replicache";
import useSWR from "swr";
import { MessageContents } from ".";

export const MessageComposer = (props: {
  entityID: string;
  onSubmit: () => void;
}) => {
  let key = `message-draft-${props.entityID}`;
  let { rootEntity } = useReplicache();

  let messages = document.getElementById(`messages-${props.entityID}`);
  let { data: leafletDraft, mutate } = useSWR(key, (key) => {
    let data = localStorage.getItem(key);
    if (data) return JSON.parse(data) as PermissionToken;
    return null;
  });

  let [name, setName] = useState("");
  let [borderStyle, setBorderStyle] =
    useState<keyof typeof borderStyles>("default");

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
        <div className="flex flex-col gap-3 sm:px-4 px-3 pb-2">
          <hr className="mb-2 border-border" />
          <div
            className={`w-full relative text-sm outline-none bg-transparent`}
            style={borderStyles[borderStyle]}
          >
            <MessageAuthorInput name={name} setName={setName} />

            <MessageContents
              entityID={leafletDraft.root_entity}
              preview={false}
            />
          </div>
          <div className="flex gap-4 place-self-end">
            <MessageThemeSetter setBorderStyle={setBorderStyle} />
            <ButtonPrimary
              isDisabled={name === "" || !name}
              errorMeassage="add a name!"
              onClick={async () => {
                await submitComment(leafletDraft, props.entityID, rootEntity);
                props.onSubmit();
                setTimeout(() => {
                  messages?.scrollTo({
                    behavior: "smooth",
                    top: messages.scrollHeight,
                  });
                }, 200);
              }}
            >
              send
            </ButtonPrimary>
          </div>
        </div>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
};

const MessageThemeSetter = (props: {
  setBorderStyle: (borderStyle: keyof typeof borderStyles) => void;
}) => {
  return (
    <Popover
      trigger={<PaintSmall className="shrink-0 hover:text-accent-contrast" />}
    >
      <div className="flex flex-col gap-2 py-1">
        <div className="flex justify-between w-full items-center text-secondary font-bold">
          Color
          <div className="w-6 h-6 rounded-full border-2 border-white shadow-[0_0_0_1px_#8C8C8C] bg-test" />
        </div>
        <hr className="-mx-1 border-border-light" />
        <div className="text-secondary font-bold ">Border</div>
        <div className="grid grid-cols-4 gap-4">
          <BorderButton
            borderStyle="default"
            setBorderStyle={props.setBorderStyle}
          />

          <BorderButton
            borderStyle="double"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="shadow"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="wavy"
            className="p-0.5"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="sparkle"
            className="p-2"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="animal"
            className="pt-5 pb-2 pl-3 pr-0"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="sprouts"
            className="pt-3 pl-1"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="lilGuys"
            className="pb-1"
            setBorderStyle={props.setBorderStyle}
          />
        </div>
      </div>
    </Popover>
  );
};

const BorderButton = (props: {
  borderStyle: keyof typeof borderStyles;
  setBorderStyle: (borderStyle: keyof typeof borderStyles) => void;
  className?: string;
}) => {
  return (
    <button
      className={`w-8 h-8 rounded-md ${props.className}`}
      onClick={() => {
        props.setBorderStyle(props.borderStyle);
      }}
    >
      <div className="h-full w-full " style={borderStyles[props.borderStyle]} />
    </button>
  );
};

const MessageAuthorInput = (props: {
  name: string;
  setName: (name: string) => void;
}) => {
  let date = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let inputRef = useRef<HTMLInputElement | null>(null);
  let spanRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (spanRef.current && inputRef.current) {
      inputRef.current.style.width = `${spanRef.current.offsetWidth}px`;
    }
  }, [props.name]);

  return (
    <div className="relative w-full">
      <div className="absolute left-0 right-0 -top-3 mx-2">
        <div className="max-w-full w-fit px-2 py-0.5 border border-border rounded-full bg-bg-page flex gap-2 items-baseline justify-start">
          <input
            ref={inputRef}
            type="text"
            value={props.name}
            onChange={(e) => props.setName(e.currentTarget.value)}
            placeholder="add a name..."
            className=" text-sm text-tertiary outline-none font-bold bg-transparent"
            style={{ width: "auto" }}
          />
          <div className="text-xs italic text-tertiary font-normal shrink-0">
            {date}
          </div>

          <span
            ref={spanRef}
            className={`invisible absolute whitespace-pre text-sm font-bold ${props.name ? "" : "italic"}`}
          >
            {props.name || "add a name..."}
          </span>
        </div>
      </div>
    </div>
  );
};
