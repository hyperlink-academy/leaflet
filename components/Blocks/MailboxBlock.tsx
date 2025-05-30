import { ButtonPrimary } from "components/Buttons";
import { Popover } from "components/Popover";
import { Menu, MenuItem, Separator } from "components/Layout";
import { useUIState } from "src/useUIState";
import { useState } from "react";
import { useSmoker, useToaster } from "components/Toast";
import { BlockProps } from "./Block";
import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { subscribeToMailboxWithEmail } from "actions/subscriptions/subscribeToMailboxWithEmail";
import { confirmEmailSubscription } from "actions/subscriptions/confirmEmailSubscription";
import { focusPage } from "components/Pages";
import { v7 } from "uuid";
import { sendPostToSubscribers } from "actions/subscriptions/sendPostToSubscribers";
import { getBlocksWithType } from "src/hooks/queries/useBlocks";
import { getBlocksAsHTML } from "src/utils/getBlocksAsHTML";
import { htmlToMarkdown } from "src/htmlMarkdownParsers";
import {
  addSubscription,
  removeSubscription,
  unsubscribe,
  useSubscriptionStatus,
} from "src/hooks/useSubscriptionStatus";
import { usePageTitle } from "components/utils/UpdateLeafletTitle";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { InfoSmall } from "components/Icons/InfoSmall";

export const MailboxBlock = (props: BlockProps) => {
  let isSubscribed = useSubscriptionStatus(props.entityID);
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let permission = useEntitySetContext().permissions.write;
  let { rep } = useReplicache();
  let smoke = useSmoker();
  let draft = useEntity(props.entityID, "mailbox/draft");
  let entity_set = useEntitySetContext();

  let subscriber_count = useEntity(props.entityID, "mailbox/subscriber-count");
  if (!permission)
    return (
      <MailboxReaderView entityID={props.entityID} parent={props.parent} />
    );

  return (
    <div className={`mailboxContent relative w-full flex flex-col gap-1`}>
      <div
        className={`flex flex-col gap-2 items-center justify-center w-full
          ${isSelected ? "block-border-selected " : "block-border"} `}
        style={{
          backgroundColor:
            "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
        }}
      >
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
                  firstBlockEntity: v7(),
                  firstBlockFactID: v7(),
                });
              }
              useUIState.getState().openPage(props.parent, entity);
              if (rep) focusPage(entity, rep, "focusFirstBlock");
              return;
            }}
          >
            {draft ? "Edit Draft" : "Write a Post"}
          </ButtonPrimary>
          <MailboxInfo />
        </div>
      </div>
      <div className="flex gap-3 items-center justify-between">
        {
          <>
            {!isSubscribed?.confirmed ? (
              <SubscribePopover
                entityID={props.entityID}
                unconfirmed={!!isSubscribed && !isSubscribed.confirmed}
                parent={props.parent}
              />
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
            <div className="flex gap-2 place-items-center">
              <span className="text-tertiary">
                {!subscriber_count ||
                subscriber_count?.data.value === undefined ||
                subscriber_count?.data.value === 0
                  ? "no"
                  : subscriber_count?.data.value}{" "}
                reader
                {subscriber_count?.data.value === 1 ? "" : "s"}
              </span>
              <Separator classname="h-5" />

              <GoToArchive entityID={props.entityID} parent={props.parent} />
            </div>
          </>
        }
      </div>
    </div>
  );
};

const MailboxReaderView = (props: { entityID: string; parent: string }) => {
  let isSubscribed = useSubscriptionStatus(props.entityID);
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let archive = useEntity(props.entityID, "mailbox/archive");
  let smoke = useSmoker();
  let { rep } = useReplicache();
  return (
    <div className={`mailboxContent relative w-full flex flex-col gap-1 h-32`}>
      <div
        className={`h-full flex flex-col gap-2 items-center justify-center w-full rounded-md border outline ${
          isSelected
            ? "border-border outline-border"
            : "border-border-light outline-transparent"
        }`}
        style={{
          backgroundColor:
            "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
        }}
      >
        <div className="flex flex-col w-full gap-2 p-4">
          {!isSubscribed?.confirmed ? (
            <>
              <SubscribeForm
                entityID={props.entityID}
                role={"reader"}
                parent={props.parent}
              />
            </>
          ) : (
            <div className="flex flex-col gap-2 items-center place-self-center">
              <div className=" font-bold text-secondary ">
                You&apos;re Subscribed!
              </div>
              <div className="flex flex-col gap-1 items-center place-self-center">
                {archive ? (
                  <ButtonPrimary
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (rep) {
                        useUIState
                          .getState()
                          .openPage(props.parent, archive.data.value);
                        focusPage(archive.data.value, rep);
                      }
                    }}
                  >
                    See All Posts
                  </ButtonPrimary>
                ) : (
                  <div className="text-tertiary">
                    Nothing has been posted yet
                  </div>
                )}
                <button
                  className="text-accent-contrast hover:underline text-sm"
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
    >
      <div className="text-sm text-secondary flex flex-col gap-2">
        {props.subscriber ? (
          <>
            <p className="font-bold">
              Get a notification whenever the creator posts to this mailbox!
            </p>
            <p>
              Your contact info will be kept private, and you can unsubscribe
              anytime.
            </p>
          </>
        ) : (
          <>
            <p className="font-bold">
              When you post to this mailbox, subscribers will be notified!
            </p>
            <p>Reader contact info is kept private.</p>
            <p>You can have one draft post at a time.</p>
          </>
        )}
      </div>
    </Popover>
  );
};

const SubscribePopover = (props: {
  entityID: string;
  parent: string;
  unconfirmed: boolean;
}) => {
  return (
    <Popover
      className="max-w-sm"
      trigger={
        <div className="font-bold text-accent-contrast">
          {props.unconfirmed ? "Confirm" : "Subscribe"}
        </div>
      }
    >
      <div className="text-secondary flex flex-col gap-2 py-1">
        <SubscribeForm
          compact
          entityID={props.entityID}
          role="author"
          parent={props.parent}
        />
      </div>
    </Popover>
  );
};

const SubscribeForm = (props: {
  entityID: string;
  parent: string;
  role: "author" | "reader";
  compact?: boolean;
}) => {
  let smoke = useSmoker();
  let [channel, setChannel] = useState<"email" | "sms">("email");
  let [email, setEmail] = useState("");
  let [sms, setSMS] = useState("");

  let subscription = useSubscriptionStatus(props.entityID);
  let [code, setCode] = useState("");
  let { permission_token } = useReplicache();
  if (subscription && !subscription.confirmed) {
    return (
      <div className="flex flex-col gap-3 justify-center text-center ">
        <div className="font-bold text-secondary  ">
          Enter the code we sent to{" "}
          <code
            className="italic"
            style={{ fontFamily: "var(--font-quattro)" }}
          >
            {subscription.email}
          </code>{" "}
          here!
        </div>
        <div className="flex flex-col gap-1">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              let result = await confirmEmailSubscription(
                subscription.id,
                code,
              );

              let rect = document
                .getElementById("confirm-code-button")
                ?.getBoundingClientRect();

              if (!result) {
                smoke({
                  error: true,
                  text: "oops, incorrect code",
                  position: {
                    x: rect ? rect.left + 45 : 0,
                    y: rect ? rect.top + 15 : 0,
                  },
                });
                return;
              }
              addSubscription(result.subscription);
            }}
            className="mailboxConfirmCodeInput flex gap-2 items-center mx-auto"
          >
            <input
              type="number"
              value={code}
              className="appearance-none focus:outline-none focus:border-border w-20 border border-border-light bg-bg-page rounded-md p-1"
              onChange={(e) => setCode(e.currentTarget.value)}
            />

            <ButtonPrimary type="submit" id="confirm-code-button">
              Confirm!
            </ButtonPrimary>
          </form>

          <button
            onMouseDown={() => {
              removeSubscription(subscription);
              setEmail("");
            }}
            className="text-accent-contrast hover:underline text-sm"
          >
            use another contact
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="flex flex-col gap-1">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            let subscriptionID = await subscribeToMailboxWithEmail(
              props.entityID,
              email,
              permission_token,
            );
            if (subscriptionID) addSubscription(subscriptionID);
          }}
          className={`mailboxSubscribeForm flex sm:flex-row flex-col ${props.compact && "sm:flex-col sm:gap-2"} gap-2 sm:gap-3 items-center place-self-center mx-auto`}
        >
          <div className="mailboxChannelInput flex gap-2 border border-border-light bg-bg-page rounded-md py-1 px-2 grow max-w-72 ">
            <input
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full appearance-none focus:outline-none bg-transparent"
              placeholder="youremail@email.com"
            />
          </div>
          <ButtonPrimary type="submit">Subscribe!</ButtonPrimary>
        </form>
        {props.role === "reader" && (
          <GoToArchive entityID={props.entityID} parent={props.parent} small />
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
  let pagetitle = usePageTitle(permission_token.root_entity);
  let subscriber_count = useEntity(
    props.mailboxEntity,
    "mailbox/subscriber-count",
  );
  if (!draft) return null;

  // once the send button is clicked, close the page and show a toast.
  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex gap-2">
        <em>Draft</em>
      </div>
      <button
        className="font-bold text-accent-2 bg-accent-1 border  hover:bg-accent-2 hover:text-accent-1 rounded-md px-2"
        onClick={async () => {
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
            content: <div className="font-bold">Sent Post to Readers!</div>,
            type: "success",
          });
        }}
      >
        Send
        {!subscriber_count ||
          (subscriber_count.data.value !== 0 &&
            ` to ${subscriber_count.data.value} Reader${subscriber_count.data.value === 1 ? "" : "s"}`)}
        !
      </button>
    </div>
  );
};

const GoToArchive = (props: {
  entityID: string;
  parent: string;
  small?: boolean;
}) => {
  let archive = useEntity(props.entityID, "mailbox/archive");
  let { rep } = useReplicache();

  return archive ? (
    <button
      className={`text-tertiary hover:text-accent-contrast  ${props.small && "text-sm"}`}
      onMouseDown={(e) => {
        e.preventDefault();
        if (rep) {
          useUIState.getState().openPage(props.parent, archive.data.value);
          focusPage(archive.data.value, rep);
        }
      }}
    >
      past posts
    </button>
  ) : (
    <div className={`text-tertiary text-center ${props.small && "text-sm"}`}>
      no posts yet
    </div>
  );
};
