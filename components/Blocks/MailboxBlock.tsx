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

export const MailboxBlock = (
  props: BlockProps & {
    role: "author" | "reader";
  },
) => {
  let [isSubscribed, setIsSubscribed] = useState(false);
  let [areYouSure, setAreYouSure] = useState(false);
  let isSelected = useUIState((s) =>
    s.selectedBlock.find((b) => b.value === props.entityID),
  );

  let card = useEntity(props.entityID, "block/card");
  let cardEntity = card ? card.data.value : props.entityID;
  let permission = useEntitySetContext().permissions.write;

  let { rep } = useReplicache();

  let smoke = useSmoker();

  useEffect(() => {
    if (!isSelected) {
      setAreYouSure(false);
    }
  }, [isSelected]);

  useEffect(() => {
    if (!isSelected) return;
    let listener = (e: KeyboardEvent) => {
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
  console.log(areYouSure);

  return (
    <div
      className={`mailboxContent relative w-full flex flex-col gap-1`}
      onKeyDown={(e) => {
        if (e.key === "Backspace" && permission) {
          e.stopPropagation();

          rep &&
            rep.mutate.removeBlock({
              blockEntity: props.entityID,
            });
        }
      }}
    >
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
          props.role === "reader" ? (
            <div className="flex flex-col w-full gap-2 p-4">
              {!isSubscribed ? (
                <SubscribeForm
                  role={props.role}
                  setIsSubscribed={() => {
                    setIsSubscribed(true);
                  }}
                />
              ) : (
                <div className="flex flex-col gap-2 items-center place-self-center pt-2">
                  <div className="flex font-bold text-tertiary gap-2 items-center place-self-center  ">
                    You&apos;re Subscribed! <MailboxInfo subscriber />
                  </div>
                  <div className="flex flex-col gap-1 items-center place-self-center">
                    <ButtonPrimary onClick={() => {}}>
                      See All Posts
                    </ButtonPrimary>
                    <button
                      className="text-tertiary hover:text-accent-contrast"
                      onClick={() => {
                        setIsSubscribed(false);
                      }}
                    >
                      unsubscribe
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2 p-4">
              <ButtonPrimary>Write a Post</ButtonPrimary>
              <MailboxInfo />
            </div>
          )
        ) : (
          <AreYouSure
            entityID={props.entityID}
            closeAreYouSure={() => setAreYouSure(false)}
          />
        )}
      </div>
      <div className="flex gap-3 items-center justify-between">
        {props.role === "author" && (
          <>
            {!isSubscribed ? (
              <SubscribePopover
                setIsSubscribed={() => {
                  setIsSubscribed(true);
                }}
                role={props.role}
              />
            ) : (
              <button
                className="text-tertiary hover:text-accent-contrast"
                onClick={(e) => {
                  let rect = e.currentTarget.getBoundingClientRect();

                  setIsSubscribed(false);
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
              <button className="text-tertiary hover:text-accent-contrast place-self-end">
                readers
              </button>
              <Separator classname="h-5" />

              <button className="text-tertiary hover:text-accent-contrast place-self-end">
                past posts
              </button>
            </div>
          </>
        )}
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
  role: "author" | "reader";
  setIsSubscribed: () => void;
}) => {
  return (
    <Popover
      className="max-w-xs"
      trigger={<div className="font-bold text-accent-contrast"> Subscribe</div>}
      content={
        <div className="text-sm text-secondary flex flex-col gap-2 py-1">
          <SubscribeForm
            setIsSubscribed={props.setIsSubscribed}
            role={props.role}
          />
        </div>
      }
    />
  );
};

const SubscribeForm = (props: {
  role: "author" | "reader";
  setIsSubscribed: () => void;
}) => {
  let smoke = useSmoker();
  return (
    <>
      <input
        className="border border-border-light rounded-md py-1 px-2 max-w-80 mx-auto"
        placeholder="name (optional)"
      />

      <input
        className="border border-border-light rounded-md py-1 px-2 max-w-80 mx-auto"
        placeholder="email or phone"
      />
      <div className="flex gap-2 items-center place-self-center pt-2">
        <ButtonPrimary
          onClick={(e) => {
            let rect = e.currentTarget.getBoundingClientRect();

            props.setIsSubscribed();
            smoke({
              text: "subscribed!",
              position: { x: rect.left, y: rect.top - 8 },
            });
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
      <hr className="border-border mt-2" />
      <button className="text-tertiary hover:text-accent-contrast -mb-2 ">
        see past posts
      </button>
    </>
  );
};
