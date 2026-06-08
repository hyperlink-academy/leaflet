"use client";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Popover } from "components/Popover";
import Link from "next/link";
import { useState } from "react";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { subscribeToPublication } from "app/(app)/lish/subscribeToPublication";
import { isOAuthSessionError, OAuthErrorMessage } from "components/OAuthError";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import type { OAuthSessionError } from "src/atproto-oauth";
import { HandleInput } from "./HandleInput";
import { Avatar } from "components/Avatar";
import { useIdentityData } from "components/IdentityProvider";
import { useRecordFromDid } from "src/utils/useRecordFromDid";
import { LinkIdentityModal } from "./LinkIdentityModal";
import { RSSTiny } from "components/Icons/RSSTiny";
import { Tooltip } from "components/Tooltip";
const apps = [
  { name: "Leaflet", logo: "https://leaflet.pub/logos/leaflet.svg" },
  { name: "Bluesky", logo: "https://leaflet.pub/logos/bluesky.svg" },
  { name: "Blacksky", logo: "https://leaflet.pub/logos/blacksky.svg" },
  { name: "Eurosky", logo: "https://leaflet.pub/logos/eurosky.svg" },
  { name: "Tangled", logo: "https://leaflet.pub/logos/tangled.svg" },
  { name: "Semble", logo: "https://leaflet.pub/logos/semble.svg" },
  { name: "Surf", logo: "https://leaflet.pub/logos/surf.svg" },
  { name: "Spark", logo: "https://leaflet.pub/logos/spark.svg" },
  { name: "Pckt", logo: "https://leaflet.pub/logos/pckt.svg" },
  { name: "pdsls", logo: "https://leaflet.pub/logos/pdsls.svg" },
  { name: "plyr.fm", logo: "https://leaflet.pub/logos/plyr.fm.svg" },
  { name: "Popfeed", logo: "https://leaflet.pub/logos/popfeed.svg" },
  { name: "Roomy", logo: "https://leaflet.pub/logos/roomy.svg" },
  { name: "Sill", logo: "https://leaflet.pub/logos/sill.svg" },
  { name: "Offprint", logo: "https://leaflet.pub/logos/offprint.svg" },
  { name: "Margin", logo: "https://leaflet.pub/logos/margin.svg" },
  { name: "Anisota", logo: "https://leaflet.pub/logos/anisota.svg" },
  { name: "Blento", logo: "https://leaflet.pub/logos/blento.svg" },
  { name: "Cartridge", logo: "https://leaflet.pub/logos/cartridge.svg" },
  { name: "Graze", logo: "https://leaflet.pub/logos/graze.svg" },
];

export const SubscribeWithHandle = (props: {
  autoFocus?: boolean;
  compact?: boolean;
  publicationUri: string;
  publicationUrl?: string;
  onSubscribed?: () => void;
  onAtSuccess?: () => void;
  leading?: React.ReactNode;
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
  const needsLinkConfirmation = !!viewerEmail && !viewerAtpDid;

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
    let subscribeButton = (
      <ButtonPrimary
        compact={props.compact}
        className={`subscribeButton text-sm grow shrink! min-w-0 flex items-center ${props.compact ? "gap-1!" : ""}`}
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
            if (isOAuthSessionError(result.error)) setOauthError(result.error);
            setSubscribing(false);
            return;
          }
          if (props.onAtSuccess) {
            props.onAtSuccess();
          } else {
            toaster({
              content: <div>You're Subscribed!</div>,
              type: "success",
            });
          }
          props.onSubscribed?.();
          setSubscribing(false);
        }}
      >
        {subscribing ? (
          <DotLoader />
        ) : (
          <>
            {props.leading}
            <Avatar
              size="tiny"
              src={record?.avatar}
              displayName={record?.displayName || record?.handle}
            />
            <div className="flex grow  min-w-0">
              <div className="shrink-0 pr-[6px]">
                Subscribe{!props.compact && " as"}
              </div>
              {!props.compact && (
                <span className="grow truncate min-w-0">
                  {props.user.handle}
                </span>
              )}
            </div>
          </>
        )}
      </ButtonPrimary>
    );
    return (
      <div className="flex flex-col gap-2 w-fit max-w-full min-w-0">
        <div className="flex items-stretch gap-1 min-w-0">
          {props.compact ? (
            <Tooltip
              asChild
              delayDuration={0}
              side="top"
              trigger={subscribeButton}
              className="text-sm p-1! text-tertiary"
            >
              @{props.user.handle}
            </Tooltip>
          ) : (
            subscribeButton
          )}
          {props.publicationUrl && (
            <a
              href={`${props.publicationUrl}/rss`}
              target="_blank"
              rel="noopener noreferrer"
              className={`no-underlinetext-accent-contrast shrink-0 flex`}
            >
              <ButtonPrimary className="h-full! py-0! px-0! aspect-square">
                <RSSTiny />
              </ButtonPrimary>
            </a>
          )}
        </div>
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
      <div className="subscribeHandleInputWrapper max-w-sm mx-auto w-full min-w-0">
        <div className="flex gap-1 w-full">
          <HandleInput
            autoFocus={props.autoFocus}
            compact={props.compact}
            loading={loading}
            leading={props.leading}
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
          {props.publicationUrl && (
            <a
              href={`${props.publicationUrl}/rss`}
              target="_blank"
              rel="noopener noreferrer"
              className={`no-underlinetext-accent-contrast`}
            >
              <ButtonSecondary
                className={`${props.compact ? "p-[3px]!" : "p-[6px]!"} border-border!`}
              >
                <RSSTiny />
              </ButtonSecondary>
            </a>
          )}
        </div>
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
          Link your Atmosphere account
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
      className="z-100! w-[min(24rem,var(--radix-popover-content-available-width))] flex flex-col"
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
      <div className="font-bold text-secondary pb-1 ">
        The Atmosphere is a growing ecosystem of social apps, like Leaflet and
        Bluesky.
        <br />
      </div>
      <div className="pb-3 font-bold text-secondary">
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
