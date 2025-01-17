"use client";
import { useSmoker, useToaster } from "components/Toast";
import { RSVP_Status, RSVPButtons, State, useRSVPNameState } from ".";
import { createContext, useContext, useState } from "react";
import { useRSVPData } from "src/hooks/useRSVPData";
import { confirmPhoneAuthToken } from "actions/phone_auth/confirm_phone_auth_token";
import { submitRSVP } from "actions/phone_rsvp_to_event";

import { countryCodes } from "src/constants/countryCodes";
import { Checkbox } from "components/Checkbox";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { InputWithLabel, Separator } from "components/Layout";
import { createPhoneAuthToken } from "actions/phone_auth/request_phone_auth_token";
import { Input } from "components/Input";
import { IPLocationContext } from "components/Providers/IPLocationProvider";
import { Popover } from "components/Popover";
import { InfoSmall } from "components/Icons";
import { theme } from "tailwind.config";

export function ContactDetailsForm(props: {
  status: RSVP_Status;
  entityID: string;
  setState: (s: State) => void;
  setStatus: (s: RSVP_Status) => void;
}) {
  let { status, entityID, setState, setStatus } = props;
  let focusWithinStyles =
    "focus-within:border-tertiary focus-within:outline focus-within:outline-2 focus-within:outline-tertiary focus-within:outline-offset-1";
  let toaster = useToaster();
  let { data, mutate } = useRSVPData();
  let [contactFormState, setContactFormState] = useState<
    { state: "details" } | { state: "confirm"; token: string }
  >({ state: "details" });
  let { name, setName } = useRSVPNameState();
  let [plus_ones, setPlusOnes] = useState(
    data?.rsvps?.find(
      (rsvp) =>
        data.authToken &&
        rsvp.entity === props.entityID &&
        data.authToken.country_code === rsvp.country_code &&
        data.authToken.phone_number === rsvp.phone_number,
    )?.plus_ones || 0,
  );
  let ipLocation = useContext(IPLocationContext) || "US";
  const [formState, setFormState] = useState({
    country_code:
      countryCodes.find((c) => c[1].toUpperCase() === ipLocation)?.[2] || "1",
    phone_number: "",
    confirmationCode: "",
  });

  let submit = async (
    token: Awaited<ReturnType<typeof confirmPhoneAuthToken>>,
  ) => {
    try {
      await submitRSVP({
        status,
        name: name,
        entity: entityID,
        plus_ones,
      });
    } catch (e) {
      //handle failed confirm
      return false;
    }

    mutate({
      authToken: token,
      rsvps: [
        ...(data?.rsvps || []).filter((r) => r.entity !== entityID),
        {
          name: name,
          status,
          plus_ones,
          entity: entityID,
          phone_number: token.phone_number,
          country_code: token.country_code,
        },
      ],
    });
    props.setState({ state: "default" });
    return true;
  };
  return contactFormState.state === "details" ? (
    <>
      <form
        className="rsvpForm flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (data?.authToken) {
            submit(data.authToken);
            toaster({
              content: (
                <div className="font-bold">
                  {status === "GOING"
                    ? "Yay! You're Going!"
                    : status === "MAYBE"
                      ? "You're a Maybe"
                      : "Sorry you can't make it D:"}
                </div>
              ),
              type: "success",
            });
          } else {
            let tokenId = await createPhoneAuthToken(formState);
            setContactFormState({ state: "confirm", token: tokenId });
          }
        }}
      >
        <RSVPButtons setStatus={props.setStatus} status={props.status} />

        <div className="rsvpInputs flex sm:flex-row flex-col gap-2 w-fit place-self-center ">
          <label
            htmlFor="rsvp-name-input"
            className={`
            rsvpNameInput input-with-border h-fit
            flex flex-col ${focusWithinStyles}`}
          >
            <div className="text-xs font-bold italic text-tertiary">name</div>
            <Input
              autoFocus
              id="rsvp-name-input"
              placeholder="..."
              className=" bg-transparent disabled:text-tertiary w-full appearance-none focus:outline-0"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div
            className={`rsvpPhoneInputWrapper  relative flex flex-col gap-0.5 w-full basis-2/3`}
          >
            <label
              htmlFor="rsvp-phone-input"
              className={`
              rsvpPhoneInput input-with-border
              flex flex-col ${focusWithinStyles}
              ${!!data?.authToken?.phone_number && "bg-border-light border-border-light text-tertiary"}`}
            >
              <div className=" text-xs font-bold italic text-tertiary">
                WhatsApp Number
              </div>
              <div className="flex gap-2 ">
                <div className="flex items-center gap-1">
                  <span
                    style={{
                      color:
                        formState.country_code === "" ||
                        !!data?.authToken?.phone_number
                          ? theme.colors.tertiary
                          : theme.colors.primary,
                    }}
                  >
                    +
                  </span>
                  <Input
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !e.currentTarget.value)
                        e.preventDefault();
                    }}
                    disabled={!!data?.authToken?.phone_number}
                    className="w-10 bg-transparent appearance-none focus:outline-0"
                    placeholder="1"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formState.country_code}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        country_code: e.target.value.replace(/[^0-9]/g, ""),
                      }))
                    }
                  />
                </div>
                <Separator />

                <Input
                  id="rsvp-phone-input"
                  inputMode="numeric"
                  placeholder="0000000000"
                  pattern="[0-9]*"
                  className=" bg-transparent disabled:text-tertiary w-full appearance-none focus:outline-0"
                  disabled={!!data?.authToken?.phone_number}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !e.currentTarget.value)
                      e.preventDefault();
                  }}
                  value={
                    data?.authToken?.phone_number || formState.phone_number
                  }
                  onChange={(e) =>
                    setFormState((state) => ({
                      ...state,
                      phone_number: e.target.value.replace(/[^0-9]/g, ""),
                    }))
                  }
                />
              </div>
            </label>
            <div className="text-xs italic text-tertiary leading-tight">
              Currently, all communication will be routed through{" "}
              <strong>WhatsApp</strong>. SMS coming soon!
            </div>
          </div>
          <div className="flex flex-row gap-2 w-full sm:w-32 h-fit">
            <InputWithLabel
              className="!appearance-none"
              placeholder="0"
              label="Plus ones?"
              type="number"
              min={0}
              max={4}
              value={plus_ones}
              onChange={(e) => setPlusOnes(parseInt(e.currentTarget.value))}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !e.currentTarget.value)
                  e.preventDefault();
              }}
            />
          </div>
        </div>

        <hr className="border-border" />
        <div className="flex flex-row gap-2 w-full items-center justify-end">
          <ConsentPopover />
          <ButtonTertiary
            onMouseDown={() => {
              setState({ state: "default" });
            }}
          >
            Back
          </ButtonTertiary>
          <ButtonPrimary
            disabled={
              (!data?.authToken?.phone_number &&
                (!formState.phone_number || !formState.country_code)) ||
              !name
            }
            className="place-self-end"
            type="submit"
          >
            RSVP as{" "}
            {status === "GOING"
              ? "Going"
              : status === "MAYBE"
                ? "Maybe"
                : "Can't Go"}
          </ButtonPrimary>
        </div>
      </form>
    </>
  ) : (
    <ConfirmationForm
      phoneNumber={formState.phone_number}
      token={contactFormState.token}
      value={formState.confirmationCode}
      submit={submit}
      status={status}
      onChange={(value) =>
        setFormState((state) => ({ ...state, confirmationCode: value }))
      }
    />
  );
}

const ConfirmationForm = (props: {
  phoneNumber: string;
  value: string;
  token: string;
  status: RSVP_Status;
  submit: (
    token: Awaited<ReturnType<typeof confirmPhoneAuthToken>>,
  ) => Promise<boolean>;
  onChange: (v: string) => void;
}) => {
  let smoker = useSmoker();
  let toaster = useToaster();
  return (
    <form
      className="flex flex-col gap-3 w-full"
      onSubmit={async (e) => {
        e.preventDefault();
        let rect = document
          .getElementById("rsvp-code-confirm-button")
          ?.getBoundingClientRect();
        try {
          let token = await confirmPhoneAuthToken(props.token, props.value);
          props.submit(token);
          toaster({
            content: (
              <div className="font-bold">
                {props.status === "GOING"
                  ? "Yay! You're Going!"
                  : props.status === "MAYBE"
                    ? "You're a Maybe"
                    : "Sorry you can't make it D:"}
              </div>
            ),
            type: "success",
          });
        } catch (error) {
          smoker({
            alignOnMobile: "left",
            error: true,
            text: "invalid code!",
            position: {
              x: rect ? rect.left + (rect.right - rect.left) / 2 : 0,
              y: rect ? rect.top + 26 : 0,
            },
          });
          return;
        }
      }}
    >
      <label className="rsvpNameInput relative w-full flex flex-col gap-0.5">
        <div className="absolute top-0.5 left-[6px] text-xs font-bold italic text-tertiary">
          confirmation code
        </div>

        <Input
          autoFocus
          placeholder="000000"
          className="input-with-border !pt-5 w-full "
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
        <div className="text-sm  italic text-tertiary leading-tight">
          Code was sent to <strong>{props.phoneNumber}</strong>!
        </div>
      </label>

      <ButtonPrimary
        id="rsvp-code-confirm-button"
        className="place-self-end"
        type="submit"
      >
        Confirm
      </ButtonPrimary>
    </form>
  );
};

const ConsentPopover = (props: {}) => {
  return (
    <Popover trigger={<InfoSmall className="text-accent-contrast" />}>
      <div className="text-sm text-secondary">
        By RSVPing I to consent to receive WhatsApp messages from the event
        host, via Leaflet!
      </div>
    </Popover>
  );
};
