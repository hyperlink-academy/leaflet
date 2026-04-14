"use client";
import {
  confirmEmailAuthToken,
  requestAuthEmailToken,
} from "actions/emailAuth";
import { loginWithEmailToken } from "actions/login";
import { ActionAfterSignIn } from "app/api/oauth/[route]/afterSignInActions";
import { getHomeDocs } from "app/(home-pages)/home/storage";
import { ButtonPrimary } from "components/Buttons";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { BlueskySmall } from "components/Icons/BlueskySmall";
import { Input } from "components/Input";
import { useSmoker, useToaster } from "components/Toast";
import React, { useState } from "react";
import { mutate } from "swr";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";

export function BlueskyLogin(props: {
  redirectRoute?: string;
  action?: ActionAfterSignIn;
  compact?: boolean;
}) {
  const [signingWithHandle, setSigningWithHandle] = useState(false);
  const [handle, setHandle] = useState("");

  return (
    <form action={`/api/oauth/login`} method="GET">
      <input
        type="hidden"
        name="redirect_url"
        value={props.redirectRoute || "/"}
      />
      {props.action && (
        <input
          type="hidden"
          name="action"
          value={JSON.stringify(props.action)}
        />
      )}
      {signingWithHandle ? (
        <div className="w-full flex gap-1">
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
          <ButtonPrimary type="submit">Sign In</ButtonPrimary>
        </div>
      ) : (
        <div className="flex flex-col justify-center">
          <ButtonPrimary
            fullWidth={!props.compact}
            compact={props.compact}
            className={`${props.compact ? "mx-auto text-sm" : "py-2"}`}
          >
            {props.compact ? <BlueskyTiny /> : <BlueskySmall />}
            {props.compact ? "Link" : "Log In/Sign Up with"} Bluesky
          </ButtonPrimary>
          <button
            type="button"
            className={`${props.compact ? "text-xs mt-0.5" : "text-sm  mt-[6px]"} text-accent-contrast place-self-center`}
            onClick={() => setSigningWithHandle(true)}
          >
            use an ATProto handle
          </button>
        </div>
      )}
    </form>
  );
}
