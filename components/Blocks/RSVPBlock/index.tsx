"use client";
import { Database } from "supabase/database.types";
import { BlockProps } from "components/Blocks/Block";
import { useState } from "react";
import { submitRSVP } from "actions/phone_rsvp_to_event";
import { useRSVPData } from "src/hooks/useRSVPData";
import { useEntitySetContext } from "components/EntitySetProvider";
import { ButtonSecondary } from "components/Buttons";
import { create } from "zustand";
import { combine, createJSONStorage, persist } from "zustand/middleware";
import { useUIState } from "src/useUIState";
import { theme } from "tailwind.config";
import { useToaster } from "components/Toast";
import { ContactDetailsForm } from "./ContactDetailsForm";
import styles from "./RSVPBackground.module.css";
import { Attendees } from "./Atendees";
import { SendUpdateButton } from "./SendUpdate";

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
      className={`rsvp relative flex flex-col gap-1 border  p-3 w-full rounded-lg  place-items-center justify-center ${isSelected ? "block-border-selected " : "block-border"}`}
      style={{
        backgroundColor:
          "color-mix(in oklab, rgb(var(--accent-1)), rgb(var(--bg-page)) 85%)",
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
  let [editing, setEditting] = useState(false);

  let rsvpStatus = data?.rsvps?.find(
    (rsvp) =>
      data.authToken &&
      rsvp.entity === props.entityID &&
      data.authToken.country_code === rsvp.country_code &&
      data.authToken.phone_number === rsvp.phone_number,
  )?.status;

  // IF YOU HAVE ALREADY RSVP'D
  if (rsvpStatus && !editing)
    return (
      <>
        {permissions.write && <SendUpdateButton entityID={props.entityID} />}

        <YourRSVPStatus
          entityID={props.entityID}
          setEditting={() => {
            setEditting(true);
          }}
        />
        <div className="w-full flex justify-between">
          <Attendees entityID={props.entityID} />
          <button
            className="hover:underline text-accent-contrast text-sm"
            onClick={() => {
              setStatus(rsvpStatus);
              setEditting(true);
            }}
          >
            Change RSVP
          </button>
        </div>
      </>
    );

  // IF YOU HAVEN'T RSVP'D
  if (state.state === "default")
    return (
      <>
        {permissions.write && <SendUpdateButton entityID={props.entityID} />}
        <RSVPButtons setStatus={setStatus} status={undefined} />
        <Attendees entityID={props.entityID} className="" />
      </>
    );

  // IF YOU ARE CURRENTLY CONFIRMING YOUR CONTACT DETAILS
  if (state.state === "contact_details")
    return (
      <>
        <ContactDetailsForm
          status={state.status}
          setStatus={setStatus}
          setState={(newState) => {
            if (newState.state === "default" && editing) setEditting(false);
            setState(newState);
          }}
          entityID={props.entityID}
        />
      </>
    );
}

export const RSVPButtons = (props: {
  setStatus: (status: RSVP_Status) => void;
  status: RSVP_Status | undefined;
}) => {
  return (
    <div className="relative w-full sm:p-6  py-4 px-3 rounded-md border-[1.5px] border-accent-1">
      <RSVPBackground />
      <div className="relative flex flex-row gap-2 items-center mx-auto z-[1] w-fit">
        <ButtonSecondary
          type="button"
          className={
            props.status === "MAYBE"
              ? "!text-accent-2 !bg-accent-1 text-lg"
              : ""
          }
          onClick={() => props.setStatus("MAYBE")}
        >
          Maybe
        </ButtonSecondary>
        <ButtonSecondary
          type="button"
          className={
            props.status === "GOING"
              ? "!text-accent-2 !bg-accent-1 text-lg"
              : props.status === undefined
                ? "text-lg"
                : ""
          }
          onClick={() => props.setStatus("GOING")}
        >
          Going!
        </ButtonSecondary>

        <ButtonSecondary
          type="button"
          className={
            props.status === "NOT_GOING"
              ? "!text-accent-2 !bg-accent-1 text-lg"
              : ""
          }
          onClick={() => props.setStatus("NOT_GOING")}
        >
          Can&apos;t Go
        </ButtonSecondary>
      </div>
    </div>
  );
};

function YourRSVPStatus(props: {
  entityID: string;
  compact?: boolean;
  setEditting: (e: boolean) => void;
}) {
  let { data, mutate } = useRSVPData();
  let { name } = useRSVPNameState();
  let toaster = useToaster();

  let existingRSVP = data?.rsvps?.find(
    (rsvp) =>
      data.authToken &&
      rsvp.entity === props.entityID &&
      data.authToken.phone_number === rsvp.phone_number,
  );
  let rsvpStatus = existingRSVP?.status;

  let updateStatus = async (status: RSVP_Status) => {
    if (!data?.authToken) return;
    await submitRSVP({
      status,
      name: name,
      entity: props.entityID,
      plus_ones: existingRSVP?.plus_ones || 0,
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
          plus_ones: existingRSVP?.plus_ones || 0,
        },
      ],
    });
  };
  return (
    <div
      className={`relative w-full p-4 pb-5 rounded-md border-[1.5px] border-accent-1 font-bold items-center`}
    >
      <RSVPBackground />
      <div className=" relative flex flex-col gap-1 sm:gap-2 z-[1] justify-center w-fit mx-auto">
        <div
          className=" w-fit text-xl text-center text-accent-2 text-with-outline"
          style={{
            WebkitTextStroke: `3px ${theme.colors["accent-1"]}`,
            textShadow: `-4px 3px 0 ${theme.colors["accent-1"]}`,
            paintOrder: "stroke fill",
          }}
        >
          {rsvpStatus !== undefined &&
            {
              GOING: `You're Going!`,
              MAYBE: "You're a Maybe",
              NOT_GOING: "Can't Make It",
            }[rsvpStatus]}
        </div>
        {existingRSVP?.plus_ones && existingRSVP?.plus_ones > 0 ? (
          <div className="absolute -top-2 -right-6 rotate-12 h-fit w-10 bg-accent-1 font-bold text-accent-2 rounded-full -z-10">
            <div className="w-full text-center pr-[4px] pb-[1px]">
              +{existingRSVP?.plus_ones}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const RSVPBackground = () => {
  return (
    <div className="overflow-hidden absolute top-0 bottom-0 left-0 right-0 ">
      <div
        className={`rsvp-background w-full h-full bg-accent-1 z-0 ${styles.RSVPWavyBG} `}
      />
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
