import { ButtonPrimary } from "components/Buttons";
import { InfoSmall } from "components/Icons";
import { Popover } from "components/Popover";
import { Separator } from "components/Layout";
import { useUIState } from "src/useUIState";
import { useState } from "react";
import { useSmoker, useToaster } from "components/Toast";

export const MailboxBlock = (props: {
  entityID: string;
  role: "author" | "reader";
}) => {
  let [isSubscribed, setIsSubscribed] = useState(false);
  let isSelected = useUIState((s) =>
    s.selectedBlock.find((b) => b.value === props.entityID),
  );

  let smoke = useSmoker();
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* IF YOU ARE READONLY  */}

      <div className={`mailboxContent relative w-full flex flex-col gap-1`}>
        <div
          className="flex flex-col gap-2 items-center justify-center p-4 w-full rounded-md border border-border-light"
          style={{
            backgroundColor:
              "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-card)) 85%)",
          }}
        >
          {props.role === "reader" ? (
            <div className="flex flex-col w-64 gap-2">
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
                      Unsubscribe
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <ButtonPrimary>Post</ButtonPrimary>
              <MailboxInfo />
            </div>
          )}
        </div>
        <div className="flex gap-3 items-center justify-between">
          {!isSubscribed ? (
            props.role === "author" ? (
              <SubscribePopover
                setIsSubscribed={() => {
                  setIsSubscribed(true);
                }}
                role={props.role}
              />
            ) : (
              <div></div>
            )
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
            {props.role === "author" && (
              <>
                <button className="text-tertiary hover:text-accent-contrast place-self-end">
                  readers
                </button>
                <Separator classname="h-5" />
              </>
            )}
            <button className="text-tertiary hover:text-accent-contrast place-self-end">
              past posts
            </button>
          </div>
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
        className="border border-border-light rounded-md py-1 px-2"
        placeholder="name (optional)"
      />

      <input
        className="border border-border-light rounded-md py-1 px-2"
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
        {props.role === "reader" && <MailboxInfo subscriber />}
      </div>
    </>
  );
};
