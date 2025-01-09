"use client";
import { Database } from "supabase/database.types";
import { BlockProps } from "components/Blocks/Block";
import { createContext, useContext, useState } from "react";
import { submitRSVP } from "actions/phone_rsvp_to_event";
import { useRSVPData } from "src/hooks/useRSVPData";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { UpdateSmall } from "components/Icons";
import { Popover } from "components/Popover";
import { create } from "zustand";
import { combine, createJSONStorage, persist } from "zustand/middleware";
import { useUIState } from "src/useUIState";
import { Separator } from "components/Layout";
import { theme } from "tailwind.config";
import { useToaster } from "components/Toast";
import { sendUpdateToRSVPS } from "actions/sendUpdateToRSVPS";
import { useReplicache } from "src/replicache";
import { ContactDetailsForm } from "./ContactDetailsForm";
import { Checkbox } from "components/Checkbox";
import { rsvp_status } from "drizzle/schema";

export type RSVP_Status = Database["public"]["Enums"]["rsvp_status"];
let Statuses = ["GOING", "NOT_GOING", "MAYBE"];
export type State =
  | {
      state: "default";
    }
  | { state: "contact_details"; status: RSVP_Status };

export function RSVPBlock(props: BlockProps) {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  return (
    <div
      className={`rsvp flex flex-col sm:gap-2 border bg-test p-3 w-full rounded-lg ${isSelected ? "block-border-selected " : "block-border"}`}
      style={{
        backgroundColor:
          "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
      }}
    >
      <RSVPForm entityID={props.entityID} />
    </div>
  );
}

function RSVPForm(props: { entityID: string }) {
  let [state, setState] = useState<State>({ state: "default" });
  let { permissions } = useEntitySetContext();
  let { data, mutate } = useRSVPData();
  let setStatus = (status: RSVP_Status) => {
    setState({ status, state: "contact_details" });
  };

  let rsvpStatus = data?.rsvps?.find(
    (rsvp) =>
      data.authToken &&
      rsvp.entity === props.entityID &&
      data.authToken.country_code === rsvp.country_code &&
      data.authToken.phone_number === rsvp.phone_number,
  )?.status;

  // IF YOU HAVE ALREADY RSVP'D
  if (rsvpStatus)
    return permissions.write ? (
      //AND YOU'RE A HOST
      <>
        <div className="flex sm:flex-row flex-col sm:gap-0 gap-2 justify-between">
          <YourRSVPStatus entityID={props.entityID} />
          <hr className="block border-border sm:hidden w-full my-1" />
          <SendUpdateButton entityID={props.entityID} primary />
        </div>
        <hr className="border-border sm:block hidden" />

        <Attendees
          entityID={props.entityID}
          className="text-sm font-normal sm:pt-0 sm:place-self-start place-self-center pt-1"
        />
      </>
    ) : (
      // AND YOU'RE A GUEST
      <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center">
        <YourRSVPStatus entityID={props.entityID} />
        <hr className="block border-border sm:hidden w-full my-2" />
        <Attendees entityID={props.entityID} className="font-normal text-sm" />
      </div>
    );

  // IF YOU HAVEN'T RSVP'D
  if (state.state === "default")
    return permissions.write ? (
      //YOU'RE A HOST
      <>
        <div className="flex sm:flex-row flex-col sm:gap-0 gap-2 justify-between">
          <RSVPButtons setStatus={setStatus} />

          <hr className="block border-border sm:hidden w-full my-1" />
          <SendUpdateButton entityID={props.entityID} />
        </div>
        <hr className="border-border sm:block hidden" />

        <Attendees
          entityID={props.entityID}
          className="font-normal text-sm sm:pt-0 sm:place-self-start place-self-center pt-1"
        />
      </>
    ) : (
      //YOU'RE A GUEST
      <div className="flex sm:flex-row flex-col justify-between">
        <RSVPButtons setStatus={setStatus} />

        <hr className="block border-border sm:hidden w-full my-2" />

        <Attendees entityID={props.entityID} className="text-sm" />
      </div>
    );

  // IF YOU ARE CURRENTLY CONFIRMING YOUR CONTACT DETAILS
  if (state.state === "contact_details")
    return (
      <ContactDetailsForm
        status={state.status}
        setState={setState}
        entityID={props.entityID}
      />
    );
}

const RSVPButtons = (props: { setStatus: (status: RSVP_Status) => void }) => {
  return (
    <div className="grid grid-cols-3 sm:flex w-full sm:w-fit  gap-2 items-center">
      <ButtonPrimary fullWidthOnMobile onClick={() => props.setStatus("GOING")}>
        Going!
      </ButtonPrimary>
      <ButtonPrimary fullWidthOnMobile onClick={() => props.setStatus("MAYBE")}>
        Maybe
      </ButtonPrimary>
      <ButtonPrimary
        fullWidthOnMobile
        onClick={() => props.setStatus("NOT_GOING")}
      >
        Can&apos;t Go
      </ButtonPrimary>
    </div>
  );
};

function YourRSVPStatus(props: { entityID: string; compact?: boolean }) {
  let { data, mutate } = useRSVPData();
  let { name } = useRSVPNameState();
  let toaster = useToaster();

  let rsvpStatus = data?.rsvps?.find(
    (rsvp) =>
      data.authToken &&
      rsvp.entity === props.entityID &&
      data.authToken.phone_number === rsvp.phone_number,
  )?.status;

  let updateStatus = async (status: RSVP_Status) => {
    if (!data?.authToken) return;
    await submitRSVP({
      status,
      name: name,
      entity: props.entityID,
    });

    mutate({
      authToken: data.authToken,
      rsvps: [
        ...(data?.rsvps || []).filter((r) => r.entity !== props.entityID),
        {
          name: name,
          status,
          entity: props.entityID,
          phone_number: data.authToken.phone_number,
          country_code: data.authToken.country_code,
        },
      ],
    });
  };
  return (
    <div
      className={`flex flex-row gap-1 sm:gap-2 font-bold items-center ${props.compact ? "text-sm font-bold " : ""}`}
    >
      {rsvpStatus !== undefined &&
        {
          GOING: `You're Going!`,
          MAYBE: "You're a Maybe",
          NOT_GOING: "Can't Make It",
        }[rsvpStatus]}
      <Separator classname="mx-1 h-6" />
      {rsvpStatus !== "GOING" && (
        <ButtonSecondary
          className={props.compact ? "text-sm  !font-normal" : ""}
          compact
          onClick={() => {
            updateStatus("GOING");
            toaster({
              content: <div className="font-bold">RSVP updated to Going!</div>,
              type: "success",
            });
          }}
        >
          Going
        </ButtonSecondary>
      )}
      {rsvpStatus !== "MAYBE" && (
        <ButtonSecondary
          className={props.compact ? "text-sm  !font-normal" : ""}
          compact
          onClick={() => {
            updateStatus("MAYBE");
            toaster({
              content: <div className="font-bold">RSVP updated to Maybe</div>,
              type: "success",
            });
          }}
        >
          Maybe
        </ButtonSecondary>
      )}
      {rsvpStatus !== "NOT_GOING" && (
        <ButtonSecondary
          compact
          className={props.compact ? "text-sm  !font-normal" : ""}
          onClick={() => {
            updateStatus("NOT_GOING");
            toaster({
              content: (
                <div className="font-bold">
                  RSVP updated to Can&apos;t Go...
                </div>
              ),
              type: "success",
            });
          }}
        >
          Can&apos;t Go
        </ButtonSecondary>
      )}
    </div>
  );
}

function Attendees(props: { entityID: string; className?: string }) {
  let { data } = useRSVPData();
  let attendees =
    data?.rsvps?.filter((rsvp) => rsvp.entity === props.entityID) || [];
  let going = attendees.filter((rsvp) => rsvp.status === "GOING");
  let maybe = attendees.filter((rsvp) => rsvp.status === "MAYBE");
  let notGoing = attendees.filter((rsvp) => rsvp.status === "NOT_GOING");

  return (
    <Popover
      align="start"
      className="text-sm text-secondary flex flex-col gap-2 max-w-sm"
      asChild
      trigger={
        going.length === 0 && maybe.length === 0 ? (
          <button
            className={`w-max text-tertiary italic hover:underline ${props.className}`}
          >
            No RSVPs yet
          </button>
        ) : (
          <ButtonTertiary className={props.className}>
            {going.length > 0 && `${going.length} Going`}
            {maybe.length > 0 &&
              `${going.length > 0 ? ", " : ""}${maybe.length} Maybe`}
          </ButtonTertiary>
        )
      }
    >
      {going.length === 0 && maybe.length === 0 && notGoing.length === 0 && (
        <div className="text-tertiary italic">No RSVPs yet</div>
      )}
      {going.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="font-bold text-tertiary">Going ({going.length})</div>
          {going.map((rsvp) => (
            <div key={rsvp.phone_number}>{rsvp.name}</div>
          ))}
        </div>
      )}
      {maybe.length > 0 && (
        <div className="flex flex-col gap-0">
          <div className="font-bold text-tertiary">Maybe ({maybe.length})</div>
          {maybe.map((rsvp) => (
            <div key={rsvp.phone_number}>{rsvp.name}</div>
          ))}
        </div>
      )}
      {notGoing.length > 0 && (
        <div className="flex flex-col gap-0">
          <div className="font-bold text-tertiary">
            Can&apos;t Go ({notGoing.length})
          </div>
          {notGoing.map((rsvp) => (
            <div key={rsvp.phone_number}>{rsvp.name}</div>
          ))}
        </div>
      )}
    </Popover>
  );
}

function SendUpdateButton(props: { entityID: string; primary?: boolean }) {
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
        props.primary ? (
          <ButtonPrimary fullWidthOnMobile>
            <UpdateSmall /> Send a Text Blast
          </ButtonPrimary>
        ) : (
          <ButtonSecondary fullWidthOnMobile>
            <UpdateSmall /> Send a Text Blast
          </ButtonSecondary>
        )
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
                    color: theme.colors["accent-contrast"],
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
              if (!permission_token) return;
              await sendUpdateToRSVPS(permission_token, {
                entity: props.entityID,
                message: input,
                eventName: document.title,
                sendto: checkedRecipients,
              });
              toaster({
                content: <div className="font-bold">Update sent!</div>,
                type: "success",
              });
              setOpen(false);
            }}
          >
            Text {allRecipients} {allRecipients === 1 ? "Person" : "People"}
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

export let useRSVPNameState = create(
  persist(
    combine({ name: "" }, (set) => ({
      setName: (name: string) => set({ name }),
    })),
    {
      name: "rsvp-name",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
