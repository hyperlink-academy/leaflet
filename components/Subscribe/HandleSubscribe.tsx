"use client";
import { ButtonPrimary } from "components/Buttons";
import { Popover } from "components/Popover";
import Link from "next/link";
import { useState } from "react";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { subscribeToPublication } from "app/lish/subscribeToPublication";
import { isOAuthSessionError, OAuthErrorMessage } from "components/OAuthError";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import type { OAuthSessionError } from "src/atproto-oauth";
import { HandleInput } from "./HandleInput";
import { Avatar } from "components/Avatar";
import { useIdentityData } from "components/IdentityProvider";
import { useRecordFromDid } from "src/utils/useRecordFromDid";
import { LinkIdentityModal } from "./LinkIdentityModal";
const apps = [
  { name: "Leaflet", logo: "/logos/leaflet.svg" },
  { name: "Bluesky", logo: "/logos/bluesky.svg" },
  { name: "Blacksky", logo: "/logos/blacksky.svg" },
  { name: "Eurosky", logo: "/logos/eurosky.svg" },
  { name: "Tangled", logo: "/logos/tangled.svg" },
  { name: "Semble", logo: "/logos/semble.svg" },
  { name: "Surf", logo: "/logos/surf.svg" },
  { name: "Spark", logo: "/logos/spark.svg" },
  { name: "Pckt", logo: "/logos/pckt.svg" },
  { name: "pdsls", logo: "/logos/pdsls.svg" },
  { name: "plyr.fm", logo: "/logos/plyr.fm.svg" },
  { name: "Popfeed", logo: "/logos/popfeed.svg" },
  { name: "Roomy", logo: "/logos/roomy.svg" },
  { name: "Sill", logo: "/logos/sill.svg" },
  { name: "Offprint", logo: "/logos/offprint.svg" },
  { name: "Margin", logo: "/logos/margin.svg" },
  { name: "Anisota", logo: "/logos/anisota.svg" },
  { name: "Blento", logo: "/logos/blento.svg" },
  { name: "Cartridge", logo: "/logos/cartridge.svg" },
  { name: "Graze", logo: "/logos/graze.svg" },
];

import { Separator } from "components/Layout";

export const SubscribeWithHandle = (props: {
  autoFocus?: boolean;
  publicationUri: string;
  onSubscribed?: () => void;
  user: {
    loggedIn: boolean;
    email: string | undefined;
    handle: string | undefined;
  };
}) => {
  let toaster = useToaster();
  let { identity } = useIdentityData();
  let { data: record } = useRecordFromDid(identity?.atp_did);
  let [loading, setLoading] = useState(false);
  let [subscribing, setSubscribing] = useState(false);
  let [oauthError, setOauthError] = useState<OAuthSessionError | null>(null);
  // When an email-only user subscribes via the atproto flow, we surface a
  // confirmation modal first ("link Bluesky to your account?") so they can't
  // accidentally orphan their email account.
  let [pendingLinkHandle, setPendingLinkHandle] = useState<string | null>(null);
  const viewerEmail = identity?.email;
  const viewerAtpDid = identity?.atp_did;
  const needsLinkConfirmation =
    !!viewerEmail && !viewerAtpDid;

  const redirectToOauthForSubscribe = (handle: string, link: boolean) => {
    let action = encodeActionToSearchParam({
      action: "subscribe",
      publication: props.publicationUri,
    });
    let url = new URL(window.location.href);
    url.searchParams.set("refreshAuth", "");
    let redirectUrl = encodeURIComponent(url.toString());
    let extra = link ? "&link=true&autoMerge=true" : "";
    window.location.href = `/api/oauth/login?handle=${encodeURIComponent(handle)}&redirect_url=${redirectUrl}&action=${action}${extra}`;
  };

  if (props.user.loggedIn && props.user.handle) {
    return (
      <div className="flex flex-col gap-2">
        <ButtonPrimary
          className="mx-auto max-w-full"
          disabled={subscribing}
          onClick={async () => {
            if (subscribing) return;
            setSubscribing(true);
            setOauthError(null);
            let url = new URL(window.location.href);
            url.searchParams.set("refreshAuth", "");
            let result = await subscribeToPublication(
              props.publicationUri,
              url.toString(),
            );
            if (!result.success) {
              if (isOAuthSessionError(result.error))
                setOauthError(result.error);
              setSubscribing(false);
              return;
            }
            toaster({
              content: <div>You're Subscribed!</div>,
              type: "success",
            });
            props.onSubscribed?.();
            setSubscribing(false);
          }}
        >
          {subscribing ? (
            <DotLoader />
          ) : (
            <>
              <span className="shrink-0">Subscribe as</span>
              <span className="flex gap-1 items-center max-w-full grow min-w-0">
                <Avatar
                  size="tiny"
                  src={record?.avatar}
                  displayName={record?.displayName || record?.handle}
                />

                <div className="grow truncate">{props.user.handle}</div>
              </span>
            </>
          )}
        </ButtonPrimary>
        {oauthError && (
          <OAuthErrorMessage
            error={oauthError}
            className="text-center text-sm text-accent-1"
          />
        )}
      </div>
    );
  } else
    return (
      <div className="max-w-sm mx-auto w-full ">
        <HandleInput
          autoFocus={props.autoFocus}
          loading={loading}
          onSubmit={(handle) => {
            let trimmed = handle.trim();
            if (!trimmed) return;
            if (needsLinkConfirmation) {
              setPendingLinkHandle(trimmed);
              return;
            }
            setLoading(true);
            redirectToOauthForSubscribe(trimmed, false);
          }}
          action=<div className="bg-accent-1 rounded-md px-1 text-accent-2 font-bold text-sm">
            Subscribe
          </div>
        />
        <div className=" pt-1 ">
          <AtmosphericHandleInfo />
        </div>
        {needsLinkConfirmation && (
          <LinkIdentityModal
            open={pendingLinkHandle !== null}
            onOpenChange={(open) => {
              if (!open) setPendingLinkHandle(null);
            }}
            signedInAs={viewerEmail!}
            linkingIdentity={`@${pendingLinkHandle ?? ""}`}
            confirmButtonLabel="Link Bluesky"
            confirming={loading}
            onConfirm={() => {
              if (!pendingLinkHandle) return;
              setLoading(true);
              redirectToOauthForSubscribe(pendingLinkHandle, true);
            }}
          />
        )}
      </div>
    );
};

export const LinkHandle = (props: { compact?: boolean }) => {
  let [loading, setLoading] = useState(false);
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
        <AtmosphericHandleInfo />
      </div>
      <div className="text-base">
        <HandleInput
          loading={loading}
          onSubmit={(handle) => {
            let trimmed = handle.trim();
            if (!trimmed) return;
            setLoading(true);
            let url = new URL(window.location.href);
            url.searchParams.set("refreshAuth", "");
            let redirectUrl = encodeURIComponent(url.toString());
            window.location.href = `/api/oauth/login?handle=${encodeURIComponent(trimmed)}&redirect_url=${redirectUrl}`;
          }}
          action={
            <div className="bg-accent-1 rounded-md px-1 text-accent-2 font-bold text-sm">
              Link
            </div>
          }
        />
      </div>
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

export const AtmosphericHandleInfo = (props: { trigger?: React.ReactNode }) => {
  return (
    <Popover
      className="z-100! max-w-sm flex flex-col"
      trigger={
        props.trigger ? (
          props.trigger
        ) : (
          <div className="text-accent-contrast text-sm">
            What's the Atmosphere?
          </div>
        )
      }
    >
      <div className="font-bold text-secondary pb-1">
        The Atmosphere is a growing ecosystem of social apps, like Leaflet and
        Bluesky.
        <br />
      </div>
      <div className="pb-3  font-bold text-secondary">
        One account gets you into <em>all</em> of them.
      </div>

      <div className=" text-sm text-tertiary uppercase">
        Apps on the Atmosphere!
      </div>
      <div className="opaque-container pt-3 pb-2 overflow-hidden">
        <div className="logo-scroll-track flex w-max">
          {[...apps, ...apps].map((app, i) => (
            <AtApp key={i} logo={app.logo} name={app.name} />
          ))}
        </div>
      </div>

      <ButtonPrimary fullWidth className="mt-3 mx-auto mb-3">
        Sign up via Bluesky!
      </ButtonPrimary>
    </Popover>
  );
};

const AtApp = (props: { logo: string; name: string }) => {
  return (
    <div className="w-20 flex-shrink-0 flex flex-col gap-2 justify-center text-tertiary font-bold text-sm text-center">
      <img src={props.logo} alt={props.name} className="w-12 h-12 mx-auto" />
      {props.name}
    </div>
  );
};
