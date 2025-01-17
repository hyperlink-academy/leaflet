"use client";
import { useState } from "react";
import { useRSVPData } from "src/hooks/useRSVPData";
import { useEntitySetContext } from "components/EntitySetProvider";
import { ButtonPrimary } from "components/Buttons";
import { UpdateSmall } from "components/Icons";
import { Popover } from "components/Popover";
import { theme } from "tailwind.config";
import { useToaster } from "components/Toast";
import { sendUpdateToRSVPS } from "actions/sendUpdateToRSVPS";
import { useReplicache } from "src/replicache";
import { Checkbox } from "components/Checkbox";
import { usePublishLink } from "components/ShareOptions";

export function SendUpdateButton(props: { entityID: string }) {
  let publishLink = usePublishLink();
  let { permissions } = useEntitySetContext();
  let { permission_token } = useReplicache();
  let [input, setInput] = useState("");
  let toaster = useToaster();
  let [open, setOpen] = useState(false);
  let [checkedRecipients, setCheckedRecipients] = useState({
    GOING: true,
    MAYBE: true,
    NOT_GOING: false,
  });

  let { data, mutate } = useRSVPData();
  let attendees =
    data?.rsvps?.filter((rsvp) => rsvp.entity === props.entityID) || [];
  let going = attendees.filter((rsvp) => rsvp.status === "GOING");
  let maybe = attendees.filter((rsvp) => rsvp.status === "MAYBE");
  let notGoing = attendees.filter((rsvp) => rsvp.status === "NOT_GOING");

  let allRecipients =
    ((checkedRecipients.GOING && going.length) || 0) +
    ((checkedRecipients.MAYBE && maybe.length) || 0) +
    ((checkedRecipients.NOT_GOING && notGoing.length) || 0);

  if (!!!permissions.write) return;
  return (
    <Popover
      asChild
      open={open}
      onOpenChange={(open) => setOpen(open)}
      trigger={
        <ButtonPrimary fullWidth className="mb-2">
          <UpdateSmall /> Send a Text Blast
        </ButtonPrimary>
      }
    >
      <div className="rsvpMessageComposer flex flex-col gap-2 w-[1000px] max-w-full sm:max-w-md">
        <div className="flex flex-col font-bold text-secondary">
          <h3>Send a Text Blast to</h3>
          <RecipientPicker
            checked={checkedRecipients}
            setChecked={setCheckedRecipients}
          />

          <textarea
            id="rsvp-message-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            className="input-with-border w-full h-[150px] mt-3 pt-0.5 font-normal text-primary"
          />
        </div>
        <div className="flex justify-between items-start">
          <div
            className={`rsvpMessageCharCounter text-sm text-tertiary`}
            style={
              input.length > 300
                ? {
                    color: theme.colors["accent-1"],
                    fontWeight: "bold",
                  }
                : {
                    color: theme.colors["tertiary"],
                  }
            }
          >
            {input.length}/300 {input.length > 300 && " (too long!)"}
          </div>
          <ButtonPrimary
            disabled={input.length > 300}
            className="place-self-end "
            onClick={async () => {
              if (!permission_token || !publishLink) return;
              await sendUpdateToRSVPS(permission_token, {
                entity: props.entityID,
                message: input,
                eventName: document.title,
                sendto: checkedRecipients,
                publicLeafletID: publishLink,
              });
              toaster({
                content: <div className="font-bold">Update sent!</div>,
                type: "success",
              });
              setOpen(false);
            }}
          >
            Text {allRecipients} {allRecipients === 1 ? "Person" : "People"}!
          </ButtonPrimary>
        </div>
      </div>
    </Popover>
  );
}

const RecipientPicker = (props: {
  checked: { GOING: boolean; MAYBE: boolean; NOT_GOING: boolean };
  setChecked: (checked: {
    GOING: boolean;
    MAYBE: boolean;
    NOT_GOING: boolean;
  }) => void;
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      {/* <small className="font-normal">
        Send a text to everyone who RSVP&apos;d:
      </small> */}
      <div className="flex gap-4 text-secondary">
        <Checkbox
          className="!w-fit"
          checked={props.checked.GOING}
          onChange={() => {
            props.setChecked({
              ...props.checked, // Spread the existing values
              GOING: !props.checked.GOING,
            });
          }}
        >
          Going
        </Checkbox>
        <Checkbox
          className="!w-fit"
          checked={props.checked.MAYBE}
          onChange={() => {
            props.setChecked({
              ...props.checked, // Spread the existing values
              MAYBE: !props.checked.MAYBE,
            });
          }}
        >
          Maybe
        </Checkbox>
        <Checkbox
          className="!w-fit"
          checked={props.checked.NOT_GOING}
          onChange={() => {
            props.setChecked({
              ...props.checked, // Spread the existing values
              NOT_GOING: !props.checked.NOT_GOING,
            });
          }}
        >
          Can&apos;t Go
        </Checkbox>
      </div>
    </div>
  );
};
