"use client";
import {
  confirmEmailAuthToken,
  requestAuthEmailToken,
} from "actions/emailAuth";
import { loginWithEmailToken } from "actions/login";
import { ButtonPrimary } from "components/Buttons";
import { InputWithLabel } from "components/Layout";
import { useSmoker } from "components/Toast";
import React, { useState } from "react";
import { mutate } from "swr";

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

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formState.stage !== "code") return;
    const confirmedToken = await confirmEmailAuthToken(
      formState.tokenId,
      formState.confirmationCode,
    );
    await loginWithEmailToken();
    mutate("identity");
  };

  let smoker = useSmoker();

  if (formState.stage === "code") {
    return (
      <div className="w-full max-w-md flex flex-col gap-3 py-1">
        <div className=" text-secondary font-bold">
          Please enter the code we sent to
          <div className="italic truncate">{formState.email}</div>
        </div>
        <form onSubmit={handleSubmitCode} className="flex flex-col gap-2 ">
          <InputWithLabel
            label="code"
            type="text"
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
            onMouseDown={(e) => {
              // smoker({
              //   error: true,
              //   text: "incorrect code!",
              //   position: {
              //     y: e.clientY,
              //     x: e.clientX,
              //   },
              // });
            }}
          >
            Confirm
          </ButtonPrimary>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm pb-1">
      <div className="flex flex-col gap-0.5">
        <h3>Log In or Sign Up</h3>
        <div className=" text-secondary">
          Save your leaflets and access them on multiple devices!
        </div>
      </div>
      <form onSubmit={handleSubmitEmail} className="flex flex-col gap-2">
        <InputWithLabel
          label="Email"
          type="email"
          placeholder="email@example.com"
          value={formState.email}
          className=""
          onChange={(e) =>
            setFormState({
              ...formState,
              email: e.target.value,
            })
          }
          required
        />

        <ButtonPrimary type="submit" className="place-self-end">
          Log In / Sign Up
        </ButtonPrimary>
      </form>
    </div>
  );
}