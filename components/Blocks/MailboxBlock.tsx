import { ButtonPrimary } from "components/Buttons";
import { InfoSmall } from "components/Icons";
import { Popover } from "components/Popover";
import { Separator } from "components/Layout";
import { useUIState } from "src/useUIState";

export const MailboxBlock = (props: { entityID: string }) => {
  let isSelected = useUIState((s) =>
    s.selectedBlock.find((b) => b.value === props.entityID),
  );
  return (
    <div className=" flex flex-col gap-4 w-full">
      {/* IF YOU ARE READONLY  */}
      <div className={`mailboxContent relative w-full flex flex-col gap-1`}>
        <div
          className="flex gap-2 items-center justify-center p-6 w-full rounded-md border border-border-light"
          style={{
            backgroundColor:
              "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-card)) 85%)",
          }}
        >
          <div className="flex flex-col w-64 gap-2">
            <input
              className="border border-border-light rounded-md py-1 px-2"
              placeholder="name (optional)"
            />

            <input
              className="border border-border-light rounded-md py-1 px-2"
              placeholder="email or phone"
            />
            <div className="flex gap-2 items-center place-self-center pt-2">
              <ButtonPrimary> Get Notified</ButtonPrimary>
              <MailboxInfo subscriber />
            </div>
          </div>
        </div>
        <button className="text-tertiary hover:text-accent-contrast place-self-end ">
          past posts
        </button>
      </div>

      {/* IF YOU ARE WRITE ACCESS  */}
      <div
        className={`mailboxBlockWrapper w-full flex flex-col gap-1
      `}
      >
        <div
          className="flex gap-2 items-center justify-center p-6 w-full  rounded-md border border-border-light"
          style={{
            backgroundColor:
              "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-card)) 85%)",
          }}
        >
          <ButtonPrimary>Post</ButtonPrimary>
          <MailboxInfo />
        </div>
        <div className="flex gap-3 items-center justify-between">
          <button className="text-accent-contrast font-bold">Subscribe</button>
          <div className="flex gap-2 items-center">
            <button className="text-tertiary hover:text-accent-contrast place-self-end">
              subscribers
            </button>
            <Separator classname="h-5" />
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
