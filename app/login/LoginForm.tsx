"use client";
import {
  confirmEmailAuthToken,
  requestAuthEmailToken,
} from "actions/emailAuth";
import { loginWithEmailToken } from "actions/login";
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

  if (formState.stage === "code") {
    return (
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmitCode} className="space-y-4">
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-bold text-primary"
            >
              Enter confirmation code
            </label>
            <div className="text-sm text-tertiary mb-2">
              Code sent to {formState.email}
            </div>
            <input
              id="code"
              type="text"
              value={formState.confirmationCode}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  confirmationCode: e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-md text-primary bg-bg-page"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 text-accent-2 bg-accent-1 rounded-md font-bold"
          >
            Verify Code
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmitEmail} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-bold text-primary"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={formState.email}
            onChange={(e) =>
              setFormState({
                ...formState,
                email: e.target.value,
              })
            }
            className="w-full px-3 py-2 border rounded-md text-primary bg-bg-page"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 text-accent-2 bg-accent-1 rounded-md font-bold"
        >
          Continue with Email
        </button>
      </form>
    </div>
  );
}
