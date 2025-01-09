"use client";
import { useSmoker } from "components/Toast";
import { RSVP_Status, State, useRSVPNameState } from ".";
import { createContext, useContext, useState } from "react";
import { useRSVPData } from "src/hooks/useRSVPData";
import { confirmPhoneAuthToken } from "actions/phone_auth/confirm_phone_auth_token";
import { submitRSVP } from "actions/phone_rsvp_to_event";

import { countryCodes } from "src/constants/countryCodes";
import { Checkbox } from "components/Checkbox";
import { ButtonPrimary } from "components/Buttons";
import { Separator } from "components/Layout";
import { createPhoneAuthToken } from "actions/phone_auth/request_phone_auth_token";
import { Input } from "components/Input";
import { IPLocationContext } from "components/Providers/IPLocationProvider";

export function ContactDetailsForm({
  status,
  entityID,
}: {
  status: RSVP_Status;
  entityID: string;
  setState: (s: State) => void;
}) {
  let focusWithinStyles =
    "focus-within:border-tertiary focus-within:outline focus-within:outline-2 focus-within:outline-tertiary focus-within:outline-offset-1";
  let [checked, setChecked] = useState(false);

  let { data, mutate } = useRSVPData();
  let [state, setState] = useState<
    { state: "details" } | { state: "confirm"; token: string }
  >({ state: "details" });
  let { name, setName } = useRSVPNameState();
  let ipLocation = useContext(IPLocationContext) || "US";
  const [formState, setFormState] = useState({
    country_code:
      countryCodes.find((c) => c[1].toUpperCase() === ipLocation)?.[2] || "1",
    phone_number: "",
    confirmationCode: "",
  });
  let [enterNewNumber, setEnterNewNumber] = useState(false);

  let submit = async (
    token: Awaited<ReturnType<typeof confirmPhoneAuthToken>>,
  ) => {
    try {
      await submitRSVP({
        status,
        name: name,
        entity: entityID,
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
          entity: entityID,
          phone_number: token.phone_number,
          country_code: token.country_code,
        },
      ],
    });
    return true;
  };
  return state.state === "details" ? (
    <div className="rsvpForm flex flex-col gap-2">
      <div className="rsvpInputs flex sm:flex-row flex-col gap-2 w-fit place-self-center ">
        <label
          htmlFor="rsvp-name-input"
          className={`
            rsvpNameInput input-with-border basis-1/3 h-fit
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
                <span>+</span>
                <Input
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !e.currentTarget.value)
                      e.preventDefault();
                  }}
                  disabled={!!data?.authToken?.phone_number}
                  className="w-10 bg-transparent"
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
                value={data?.authToken?.phone_number || formState.phone_number}
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
            Non-US numbers will receive messages through{" "}
            <strong>WhatsApp</strong>
          </div>
        </div>
      </div>

      <hr className="border-border" />
      <div className="flex flex-row gap-2 w-full items-center justify-end">
        <ConsentPopover checked={checked} setChecked={setChecked} />
        <ButtonPrimary
          disabled={
            (!data?.authToken?.phone_number &&
              (!checked ||
                !formState.phone_number ||
                !formState.country_code)) ||
            (!!data?.authToken?.phone_number && !checked)
          }
          className="place-self-end"
          onClick={async () => {
            if (data?.authToken) {
              submit(data.authToken);
            } else {
              let tokenId = await createPhoneAuthToken(formState);
              setState({ state: "confirm", token: tokenId });
            }
          }}
        >
          RSVP as {status === "GOING" ? "Going" : "Maybe"}
        </ButtonPrimary>
      </div>
    </div>
  ) : (
    <ConfirmationForm
      token={state.token}
      value={formState.confirmationCode}
      submit={submit}
      onChange={(value) =>
        setFormState((state) => ({ ...state, confirmationCode: value }))
      }
    />
  );
}

const ConfirmationForm = (props: {
  value: string;
  token: string;
  submit: (
    token: Awaited<ReturnType<typeof confirmPhoneAuthToken>>,
  ) => Promise<boolean>;
  onChange: (v: string) => void;
}) => {
  let smoker = useSmoker();
  return (
    <div className="flex flex-col gap-2">
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
        <div className="text-xs italic text-tertiary leading-tight">
          we texted a confirmation code to your phone number!
        </div>
      </label>
      <hr className="border-border" />

      <ButtonPrimary
        className="place-self-end"
        onMouseDown={async (e) => {
          try {
            let token = await confirmPhoneAuthToken(props.token, props.value);
            props.submit(token);
          } catch (error) {
            smoker({
              alignOnMobile: "left",
              error: true,
              text: "invalid code!",
              position: { x: e.clientX, y: e.clientY },
            });
            return;
          }
        }}
      >
        Confirm
      </ButtonPrimary>
    </div>
  );
};

const ConsentPopover = (props: {
  checked: boolean;
  setChecked: (checked: boolean) => void;
}) => {
  return (
    <Checkbox
      checked={props.checked}
      onChange={() => {
        props.setChecked(!props.checked);
      }}
    >
      <div className="text-sm text-secondary">
        Clicking RSVP means that you are consenting to receive WhatsApp messages
        from the host of this event, via Leaflet!
      </div>
    </Checkbox>
  );
};
