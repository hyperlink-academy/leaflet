"use client";
import {
  confirmEmailAuthToken,
  requestAuthEmailToken,
} from "actions/emailAuth";
import { loginWithEmailToken } from "actions/login";
import { getHomeDocs } from "app/home/storage";
import { ButtonPrimary } from "components/Buttons";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { BlueskySmall } from "components/Icons/BlueskySmall";
import { Input } from "components/Input";
import { useSmoker, useToaster } from "components/Toast";
import React, { useState } from "react";
import useSWR, { mutate } from "swr";

export default function LoginForm() {
  type FormState =
    | {
        stage: "email";
        email: string;
      }
    | {
        stage: "code";
        email: string;
        tokenId: string;
        confirmationCode: string;
      };

  const [formState, setFormState] = useState<FormState>({
    stage: "email",
    email: "",
  });

  let { data: localLeaflets } = useSWR("leaflets", () => getHomeDocs(), {
    fallbackData: [],
  });

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokenId = await requestAuthEmailToken(formState.email);
    setFormState({
      stage: "code",
      email: formState.email,
      tokenId,
      confirmationCode: "",
    });
  };

  let smoker = useSmoker();
  let toaster = useToaster();

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    let rect = e.currentTarget.getBoundingClientRect();

    if (formState.stage !== "code") return;
    const confirmedToken = await confirmEmailAuthToken(
      formState.tokenId,
      formState.confirmationCode,
    );

    if (!confirmedToken) {
      smoker({
        error: true,
        text: "incorrect code!",
        position: {
          y: rect.bottom - 16,
          x: rect.right - 220,
        },
      });
    } else {
      await loginWithEmailToken(localLeaflets.filter((l) => !l.hidden));
      mutate("identity");
      toaster({
        content: <div className="font-bold">Logged in! Welcome!</div>,
        type: "success",
      });
    }
  };

  if (formState.stage === "code") {
    return (
      <div className="w-full max-w-md flex flex-col gap-3 py-1">
        <div className=" text-secondary font-bold">
          Please enter the code we sent to
          <div className="italic truncate">{formState.email}</div>
        </div>
        <form onSubmit={handleSubmitCode} className="flex flex-col gap-2 ">
          <Input
            type="text"
            className="input-with-border"
            placeholder="000000"
            value={formState.confirmationCode}
            onChange={(e) =>
              setFormState({
                ...formState,
                confirmationCode: e.target.value,
              })
            }
            required
          />

          <ButtonPrimary
            type="submit"
            className="place-self-end"
            disabled={formState.confirmationCode === ""}
            onMouseDown={(e) => {}}
          >
            Confirm
          </ButtonPrimary>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs pb-1">
      <div className="flex flex-col">
        <h4 className="text-primary">Log In or Sign Up</h4>
        <div className=" text-tertiary text-sm">
          Save your Leaflets and access them on multiple devices!
        </div>
      </div>

      <BlueskyLogin />

      <div className="flex gap-2 text-border italic w-full items-center">
        <hr className="border-border-light w-full" />
        <div>or</div>
        <hr className="border-border-light w-full" />
      </div>
      <form
        onSubmit={handleSubmitEmail}
        className="flex flex-col gap-2 relative"
      >
        <Input
          type="email"
          placeholder="email@example.com"
          value={formState.email}
          className="input-with-border p-7"
          onChange={(e) =>
            setFormState({
              ...formState,
              email: e.target.value,
            })
          }
          required
        />

        <ButtonPrimary
          type="submit"
          className="place-self-end !px-[2px] absolute right-1 bottom-1"
        >
          <ArrowRightTiny />{" "}
        </ButtonPrimary>
      </form>
    </div>
  );
}

function BlueskyLogin() {
  const [signingWithHandle, setSigningWithHandle] = useState(false);
  const [handle, setHandle] = useState("");

  return (
    <form action="/api/oauth/login?redirect_url=/" method="GET">
      {signingWithHandle ? (
        <div className="w-full flex flex-col gap-2">
          <Input
            type="text"
            name="handle"
            id="handle"
            placeholder="you.bsky.social"
            value={handle}
            className="input-with-border"
            onChange={(e) => setHandle(e.target.value)}
            required
          />
          <ButtonPrimary type="submit" fullWidth className="py-2">
            <BlueskySmall />
            Sign In
          </ButtonPrimary>
        </div>
      ) : (
        <div className="flex flex-col">
          <ButtonPrimary fullWidth className="py-2">
            <BlueskySmall />
            Log In/Sign Up with Bluesky
          </ButtonPrimary>
          <button
            type="button"
            className="text-sm text-accent-contrast place-self-center mt-[6px]"
            onClick={() => setSigningWithHandle(true)}
          >
            or use an ATProto handle
          </button>
        </div>
      )}
    </form>
  );
}
