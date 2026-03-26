"use client";
import { ButtonPrimary } from "components/Buttons";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { Input } from "components/Input";
import { Popover } from "components/Popover";
import Link from "next/link";
import { useState } from "react";
import {
  LogoBlacksky,
  LogoBluesky,
  LogoEurosky,
  LogoLeaflet,
  LogoTangled,
} from "./Logos";

import { Separator } from "components/Layout";

export const SubscribeWithHandle = (props: {
  autoFocus?: boolean;
  user: {
    loggedIn: boolean;
    email: string | undefined;
    handle: string | undefined;
  };
}) => {
  if (props.user.loggedIn && props.user.handle) {
    return (
      <ButtonPrimary className="mx-auto max-w-full">
        <span className="shrink-0">Subscribe as</span>
        <span className="flex gap-1 items-center max-w-full grow min-w-0">
          <div className="w-4 h-4 shrink-0 rounded-full bg-test" />

          <div className="grow truncate">{props.user.handle}</div>
        </span>
      </ButtonPrimary>
    );
  } else
    return (
      <div className="max-w-sm mx-auto w-full ">
        <HandleInput autoFocus={props.autoFocus} />
        <div className="flex gap-2 justify-center items-center mx-auto pt-0.5 ">
          <UniversalHandleInfo />
          <Separator classname="h-3! border-accent-contrast!" />
          <div className="text-sm text-accent-contrast font-bold">Create</div>
        </div>
      </div>
    );
};

export const LinkHandle = (props: { compact?: boolean }) => {
  return (
    <div
      className={`flex flex-col text-center justify-center ${props.compact ? "gap-3" : "gap-4"}`}
    >
      <div
        className={`text-secondary flex flex-col ${props.compact && "text-sm leading-snug"}`}
      >
        <h4 className={`${props.compact && "text-sm"}`}>
          Link your universal handle
        </h4>
        <div className="text-tertiary">
          to comment, recommend, and see what your friends are reading
        </div>
        <UniversalHandleInfo />
      </div>
      <HandleInputandOAuth link compact />
    </div>
  );
};

export const HandleInput = (props: { autoFocus?: boolean; link?: boolean }) => {
  let [handleValue, setHandleValue] = useState("");
  return (
    <div className="handleInput input-with-border relative pl-0! py-0! flex gap-0 w-full">
      <div className="border-r border-border text-tertiary text-center w-8 shrink-0 mr-2">
        @
      </div>
      <Input
        autoFocus={props.autoFocus}
        className={`appearance-none! outline-none! w-full py-0.5 pr-22`}
        placeholder="universal.handle"
        size={0}
        value={handleValue}
        onChange={(e) => setHandleValue(e.target.value)}
      />

      <div className="absolute top-0 bottom-0 right-[4px] flex items-center">
        <ButtonPrimary
          compact
          className="leading-tight! outline-none! text-sm!"
        >
          {props.link ? "Link" : "Subscribe"}
        </ButtonPrimary>
      </div>
    </div>
  );
};

export const HandleInputandOAuth = (props: {
  link?: boolean;
  compact?: boolean;
}) => {
  return (
    <div className="handleInputAndOAuth flex flex-col">
      <HandleInput link={props.link} />
      <div
        className={`${props.compact ? "mt-1 mb-2 text-xs" : "text-sm mt-2 mb-3"} w-full flex gap-2 items-center`}
      >
        <hr className="grow border-border-light" />
        <div className="shrink-0 text-tertiary">
          or {props.link ? "link with" : "sign in via"}
        </div>
        <hr className="grow border-border-light" />
      </div>
      <ButtonPrimary
        compact={props.compact}
        className={`${props.compact && "text-sm"} `}
        fullWidth
      >
        <BlueskyTiny /> Bluesky
      </ButtonPrimary>
    </div>
  );
};

export const AtSubscribeSuccess = (props: {}) => {
  return (
    <div className="flex flex-col text-center justify-center p-4 text-secondary max-w-md">
      <h2 className="text-primary pb-1">You've Subscribed!</h2>
      You'll recieve new posts in the <br />
      <Link href={"/reader"}>Leaflet Reader</Link>
      <br />
      <span className="text-tertiary text-sm">
        or any standard.site enabled reader!
      </span>
      <hr className="my-4 border-border-light" />
      <div className="flex flex-col">
        <h4>Other ways to follow</h4>
        <Link href="">Get the RSS Feed</Link>
        <Link href="">Pin Custom Feed in Bluesky</Link>
      </div>
    </div>
  );
};

export const UniversalHandleInfo = (props: { trigger?: React.ReactNode }) => {
  return (
    <Popover
      className="z-100! max-w-sm flex flex-col gap-2"
      trigger={
        props.trigger ? (
          props.trigger
        ) : (
          <div className="text-accent-contrast text-sm">
            What's a universal handle?
          </div>
        )
      }
    >
      <div className="font-bold text-secondary">
        Your universal handle is the username you use to sign into enabled apps
        like...{" "}
      </div>
      <div className="opaque-container px-4 pt-2 pb-2 flex gap-2 w-full justify-between">
        <AtApp logo={<LogoLeaflet />} name="Leaflet" />
        <AtApp logo={<LogoBluesky />} name="Bluesky" />
        <AtApp logo={<LogoBlacksky />} name="Blacksky" />
        <AtApp logo={<LogoEurosky />} name="Eurosky" />
        <AtApp logo={<LogoTangled />} name="Tangled" />
      </div>
      <div className="text-secondary flex flex-col gap-1">
        <div>A handle can log into ANY enabled app.</div>
        <div>
          ie, you can log into <strong>Leaflet</strong> with the handle you made
          for <strong>Bluesky</strong>!
        </div>
      </div>
      <ButtonPrimary fullWidth className="mx-auto mb-3 mt-1">
        Create a handle on Bluesky!
      </ButtonPrimary>
    </Popover>
  );
};

const AtApp = (props: { logo: React.ReactNode; name: string }) => {
  return (
    <div className="basis-1/5 flex flex-col gap-2 justify-center text-tertiary font-bold text-sm text-center">
      <div className="mx-auto">{props.logo}</div>
      {props.name}
    </div>
  );
};
