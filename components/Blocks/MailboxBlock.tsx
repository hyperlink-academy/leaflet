import { ButtonPrimary } from "components/Buttons";
import { InfoSmall } from "components/Icons";
import { Popover } from "components/Popover";
import { Separator } from "components/Layout";
import { useUIState } from "src/useUIState";
import { useEffect, useState } from "react";
import { useSmoker, useToaster } from "components/Toast";
import { BlockProps } from ".";
import { useEntity, useReplicache } from "src/replicache";
import { AreYouSure } from "./DeleteBlock";
import { focusBlock } from ".";
import { useEntitySetContext } from "components/EntitySetProvider";
import { subscribeToMailboxWithEmail } from "actions/subscriptions/subscribeToMailboxWithEmail";
import { confirmEmailSubscription } from "actions/subscriptions/confirmEmailSubscription";
import { focusCard } from "components/Cards";
import { v7 } from "uuid";
import { sendPostToSubscribers } from "actions/subscriptions/sendPostToSubscribers";
import { getBlocksWithType } from "src/hooks/queries/useBlocks";
import { getBlocksAsHTML } from "src/utils/getBlocksAsHTML";
import { htmlToMarkdown } from "src/htmlMarkdownParsers";
import {
  addSubscription,
  unsubscribe,
  useSubscriptionStatus,
} from "src/hooks/useSubscriptionStatus";
import { scanIndex } from "src/replicache/utils";
import { usePageTitle } from "components/utils/UpdatePageTitle";

export const MailboxBlock = (props: BlockProps) => {
  let isSubscribed = useSubscriptionStatus(props.entityID);
  let [areYouSure, setAreYouSure] = useState(false);
  let isSelected = useUIState((s) =>
    s.selectedBlock.find((b) => b.value === props.entityID),
  );

  let card = useEntity(props.entityID, "block/card");
  let cardEntity = card ? card.data.value : props.entityID;
  let permission = useEntitySetContext().permissions.write;

  let { rep, permission_token } = useReplicache();

  let smoke = useSmoker();

  useEffect(() => {
    if (!isSelected) {
      setAreYouSure(false);
    }
  }, [isSelected]);

  useEffect(() => {
    if (!isSelected) return;
    let listener = (e: KeyboardEvent) => {
      let el = e.target as HTMLElement;
      if (
        el.tagName === "INPUT" ||
        el.tagName === "textarea" ||
        el.contentEditable === "true"
      )
        return;
      if (e.key === "Backspace" && permission) {
        if (e.defaultPrevented) return;
        if (areYouSure === false) {
          setAreYouSure(true);
        } else {
          e.preventDefault();

          rep &&
            rep.mutate.removeBlock({
              blockEntity: props.entityID,
            });

          props.previousBlock &&
            focusBlock(props.previousBlock, { type: "end" });
        }
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [
    areYouSure,
    cardEntity,
    isSelected,
    permission,
    props.entityID,
    props.previousBlock,
    rep,
  ]);
  let draft = useEntity(props.entityID, "mailbox/draft");
  let entity_set = useEntitySetContext();
  let archive = useEntity(props.entityID, "mailbox/archive");
  if (!permission) return <MailboxReaderView entityID={props.entityID} />;

  return (
    <div className={`mailboxContent relative w-full flex flex-col gap-1`}>
      <div
        className={`flex flex-col gap-2 items-center justify-center w-full rounded-md border outline ${
          isSelected
            ? "border-border outline-border"
            : "border-border-light outline-transparent"
        }`}
        style={{
          backgroundColor:
            "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-card)) 85%)",
        }}
      >
        {!areYouSure ? (
          <div className="flex gap-2 p-4">
            <ButtonPrimary
              onClick={async () => {
                let entity;
                if (draft) {
                  entity = draft.data.value;
                } else {
                  entity = v7();
                  await rep?.mutate.createDraft({
                    mailboxEntity: props.entityID,
                    permission_set: entity_set.set,
                    newEntity: entity,
                  });
                }
                useUIState.getState().openCard(props.parent, entity);
                if (rep) focusCard(entity, rep);
                return;
              }}
            >
              Write a Post
            </ButtonPrimary>
            <MailboxInfo />
          </div>
        ) : (
          <AreYouSure
            entityID={props.entityID}
            closeAreYouSure={() => setAreYouSure(false)}
          />
        )}
      </div>
      <div className="flex gap-3 items-center justify-between">
        {
          <>
            {!isSubscribed ? (
              <SubscribePopover entityID={props.entityID} role="author" />
            ) : (
              <button
                className="text-tertiary hover:text-accent-contrast"
                onClick={(e) => {
                  let rect = e.currentTarget.getBoundingClientRect();
                  unsubscribe(isSubscribed);
                  smoke({
                    text: "unsubscribed!",
                    position: { x: rect.left, y: rect.top - 8 },
                  });
                }}
              >
                Unsubscribe
              </button>
            )}
            <div className="flex gap-2 items-center">
              {archive && (
                <button
                  className="text-tertiary hover:text-accent-contrast place-self-end"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (rep) {
                      useUIState
                        .getState()
                        .openCard(props.parent, archive.data.value);
                      focusCard(archive.data.value, rep);
                    }
                  }}
                >
                  past posts
                </button>
              )}
            </div>
          </>
        }
      </div>
    </div>
  );
};

const MailboxReaderView = (props: { entityID: string }) => {
  let isSubscribed = useSubscriptionStatus(props.entityID);
  let archive = useEntity(props.entityID, "mailbox/archive");
  let smoke = useSmoker();
  return (
    <div className={`mailboxContent relative w-full flex flex-col gap-1`}>
      <div
        className={`flex flex-col gap-2 items-center justify-center w-full rounded-md border outline border-border-light outline-transparent"
      `}
        style={{
          backgroundColor:
            "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-card)) 85%)",
        }}
      >
        <div className="flex flex-col w-full gap-2 p-4">
          {!isSubscribed ? (
            <SubscribeForm entityID={props.entityID} role={"reader"} />
          ) : (
            <div className="flex flex-col gap-2 items-center place-self-center pt-2">
              <div className="flex font-bold text-tertiary gap-2 items-center place-self-center  ">
                You&apos;re Subscribed! <MailboxInfo subscriber />
              </div>
              <div className="flex flex-col gap-1 items-center place-self-center">
                {archive && (
                  <ButtonPrimary onClick={() => {}}>
                    See All Posts
                  </ButtonPrimary>
                )}
                <button
                  className="text-tertiary hover:text-accent-contrast"
                  onClick={(e) => {
                    let rect = e.currentTarget.getBoundingClientRect();
                    unsubscribe(isSubscribed);
                    smoke({
                      text: "unsubscribed!",
                      position: { x: rect.left, y: rect.top - 8 },
                    });
                  }}
                >
                  unsubscribe
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MailboxInfo = (props: { subscriber?: boolean }) => {
  return (
    <Popover
      className="max-w-xs"
      trigger={<InfoSmall className="shrink-0 text-accent-contrast" />}
      content={
        <div className="text-sm text-secondary flex flex-col gap-2">
          {props.subscriber ? (
            <>
              <div className="font-bold">
                Receive a notification whenever the author posts an update to
                this mailbox!
              </div>
              <div>
                The author will only see your name and you can unsubscribe at
                anytime.
              </div>
            </>
          ) : (
            <>
              <div className="font-bold">
                When you post to this mailbox, readers who have subscribed to it
                will receive a notification!
              </div>

              <div>
                Reader contact information will be kept private, but you will be
                able to see thier names.
              </div>
            </>
          )}
        </div>
      }
    />
  );
};

const SubscribePopover = (props: {
  entityID: string;
  role: "author" | "reader";
}) => {
  return (
    <Popover
      className="max-w-xs"
      trigger={<div className="font-bold text-accent-contrast"> Subscribe</div>}
      content={
        <div className="text-sm text-secondary flex flex-col gap-2 py-1">
          <SubscribeForm entityID={props.entityID} role={props.role} />
        </div>
      }
    />
  );
};

const SubscribeForm = (props: {
  entityID: string;
  role: "author" | "reader";
}) => {
  let smoke = useSmoker();
  let [email, setEmail] = useState("");
  let [state, setState] = useState<
    { state: "normal" } | { state: "confirm"; email: string }
  >({ state: "normal" });
  let subscriptionStatus = useSubscriptionStatus(props.entityID);
  let { permission_token } = useReplicache();
  let [subscriptionID, setSubscriptionID] = useState("");
  let [code, setCode] = useState("");
  if (state.state === "confirm") {
    return (
      <>
        <div className="font-bold text-tertiary">
          We just sent a confirmation code to <code>{state.email}</code>, enter
          it here!
        </div>
        <input
          type="number"
          value={code}
          onChange={(e) => setCode(e.currentTarget.value)}
        />
        <ButtonPrimary
          onClick={async () => {
            let result = await confirmEmailSubscription(
              subscriptionID,
              code,
              permission_token,
            );
            console.log(result);
            if (!result) return;
            addSubscription(result);
          }}
        >
          Confirm
        </ButtonPrimary>
      </>
    );
  }
  return (
    <>
      <input
        className="border border-border-light rounded-md py-1 px-2 max-w-80 mx-auto"
        placeholder="name (optional)"
      />

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border border-border-light rounded-md py-1 px-2 max-w-80 mx-auto"
        placeholder="email or phone"
      />
      <div className="flex gap-2 items-center place-self-center pt-2">
        <ButtonPrimary
          onClick={async (e) => {
            let subscriptionID = await subscribeToMailboxWithEmail(
              props.entityID,
              email,
            );
            if (subscriptionID) setSubscriptionID(subscriptionID?.id);
            setState({ state: "confirm", email });
          }}
        >
          Get Notified
        </ButtonPrimary>

        {props.role === "reader" && (
          <>
            <MailboxInfo subscriber />
          </>
        )}
      </div>
    </>
  );
};

export const DraftPostOptions = (props: { mailboxEntity: string }) => {
  let toaster = useToaster();
  let draft = useEntity(props.mailboxEntity, "mailbox/draft");
  let { rep, permission_token } = useReplicache();
  let entity_set = useEntitySetContext();
  let archive = useEntity(props.mailboxEntity, "mailbox/archive");
  let pagetitle = usePageTitle(permission_token.root_entity);
  if (!draft) return null;

  // once the send button is clicked, close the card and show a toast.
  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex gap-2">This is still a draft</div>
      <button
        className="font-bold text-accent-contrast hover:bg-bg-card rounded-md px-1"
        onClick={async () => {
          // Call the
          if (!rep) return;
          let blocks =
            (await rep?.query((tx) =>
              getBlocksWithType(tx, draft.data.value),
            )) || [];
          let html = (await getBlocksAsHTML(rep, blocks))?.join("\n");
          await sendPostToSubscribers({
            title: pagetitle,
            permission_token,
            mailboxEntity: props.mailboxEntity,
            messageEntity: draft.data.value,
            contents: {
              html,
              markdown: htmlToMarkdown(html),
            },
          });

          rep?.mutate.archiveDraft({
            entity_set: entity_set.set,
            mailboxEntity: props.mailboxEntity,
            newBlockEntity: v7(),
            archiveEntity: v7(),
          });

          toaster({
            content: (
              <div className="font-bold"> Sent Post to Subscribers!</div>
            ),
            type: "success",
          });
        }}
      >
        Post It!
      </button>
    </div>
  );
};
