"use client";
import { buildOauthLoginUrl } from "src/utils/customDomain";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Popover } from "components/Popover";
import { useState } from "react";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { subscribeToPublication } from "actions/publications/subscribeToPublication";
import { isOAuthSessionError, OAuthErrorMessage } from "components/OAuthError";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import { HandleSearchInput } from "components/HandleSearchInput";
import { Avatar } from "components/Avatar";
import { useIdentityData } from "components/IdentityProvider";
import { useRecordFromDid } from "src/utils/useRecordFromDid";
import { LinkIdentityModal } from "./LinkIdentityModal";
import { markLocallySubscribed } from "./viewerSubscription";
import { RSSTiny } from "components/Icons/RSSTiny";
import { Tooltip } from "components/Tooltip";
import { SubscribeButtonModeMenu } from "./SubscribeButton";
import type { SubscriptionSource } from "src/subscriptionSource";
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

// True when this document is running inside an iframe. Reading `window.top`
// across origins throws a SecurityError, which itself only happens when we're
// framed by a different origin — so treat that as being framed too.
const isInIframe = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export const SubscribeWithHandle = (props: {
  autoFocus?: boolean;
  compact?: boolean;
  publicationUri: string;
  publicationUrl?: string;
  source?: SubscriptionSource;
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
      // The subscribe completes after the OAuth redirect, so stamp the
      // originating page into the source now.
      ...(props.source
        ? { source: { url: window.location.href, ...props.source } }
        : {}),
    });
    let inIframe = isInIframe();
    let url = new URL(window.location.href);
    if (inIframe) {
      url.searchParams.set("showSubscribeSuccess", "true");
      url.searchParams.set("subscribed_pub", props.publicationUri);
    }
    let loginUrl = buildOauthLoginUrl({
      handle,
      redirect: url.toString(),
      action,
      link,
      autoMerge: link,
    });
    if (inIframe) {
      window.open(loginUrl, "_blank", "noopener,noreferrer");
      // The iframe stays put while the user completes login in the new tab —
      // clear the pending spinner so the embedded form isn't stuck loading.
      setLoading(false);
      return;
    }
    window.location.href = loginUrl;
  };

  // Without a handle there's no atproto identity to one-click subscribe with, so
  // fall through to the logged-out HandleSearchInput form (same as a logged-out user).
  if (props.user.loggedIn && props.user.handle) {
    let tooltipLabel = props.user.handle ? `@${props.user.handle}` : null;
    let avatar = (
      <Avatar
        size="tiny"
        src={record?.avatar}
        displayName={record?.displayName || record?.handle}
      />
    );
    const subscribeAtproto = async () => {
      if (subscribing) return;
      setSubscribing(true);
      let result = await subscribeToPublication(
        props.publicationUri,
        window.location.href,
        props.source,
      );
      if (!result.success) {
        toaster({
          type: "error",
          content: isOAuthSessionError(result.error) ? (
            <OAuthErrorMessage error={result.error} />
          ) : (
            "We couldn't subscribe you. Try again."
          ),
        });
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
      markLocallySubscribed(props.publicationUri, "atproto");
      setSubscribing(false);
    };
    let subscribeButton = (
      <ButtonPrimary
        compact={props.compact}
        className={`
          subscribeButton
          text-sm grow shrink!
          ${
            props.compact
              ? "gap-1! min-w-0 flex items-center rounded-r-none! hover:outline-transparent! focus:outline-transparent!"
              : ""
          }`}
        disabled={subscribing}
        onClick={subscribeAtproto}
      >
        {subscribing ? (
          <DotLoader className="h-auto!" />
        ) : (
          <>
            {avatar}
            <div className="flex grow  min-w-0">
              <div className="shrink-0 pr-[6px]">Subscribe</div>
              {!props.compact && (
                <span className="grow truncate min-w-0">
                  as {props.user.handle}
                </span>
              )}
            </div>
          </>
        )}
      </ButtonPrimary>
    );
    return (
      <div className="flex items-stretch gap-1 w-fit max-w-full min-w-0">
        <div
          className={`flex grow min-w-0 max-w-full ${props.compact ? "group rounded-md outline-2 outline-transparent outline-offset-1 hover:outline-accent-1 focus-within:outline-accent-1 shrink-0" : ""}`}
        >
          {props.leading && (
            <div className="shrink-0 flex items-center">{props.leading}</div>
          )}
          {props.compact && tooltipLabel ? (
            <Tooltip
              asChild
              delayDuration={0}
              side="top"
              trigger={subscribeButton}
              className="text-sm p-1! text-tertiary"
            >
              {tooltipLabel}
            </Tooltip>
          ) : (
            subscribeButton
          )}
          {props.compact && (
            <SubscribeButtonModeMenu
              disabled={subscribing}
              publicationUrl={props.publicationUrl}
              accounts={[
                {
                  value: "atproto",
                  label: `@${props.user.handle}`,
                  icon: avatar,
                  selected: true,
                  onSelect: subscribeAtproto,
                },
              ]}
            />
          )}
        </div>
        {!props.compact && (
          <a
            href={`${props.publicationUrl}/rss`}
            target="_blank"
            rel="noopener noreferrer"
            className={`no-underline shrink-0 ${props.compact ? "w-6" : "w-7"}`}
          >
            <ButtonPrimary className="h-full! w-auto! py-0! px-0! aspect-square">
              <RSSTiny />
            </ButtonPrimary>
          </a>
        )}
      </div>
    );
  } else
    return (
      <div className="subscribeHandleInputWrapper max-w-sm mx-auto w-full min-w-0">
        <div className="flex gap-1 w-full">
          <HandleSearchInput
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
            action=<div className="bg-accent-1 rounded-md px-1 text-accent-2 font-bold text-sm min-w-20 shrink-0">
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
        <div className="pt-1 w-fit mx-auto">
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
        <HandleSearchInput
          loading={loading}
          onSubmit={(handle) => {
            let trimmed = handle.trim();
            if (!trimmed) return;
            setLoading(true);
            window.location.href = buildOauthLoginUrl({
              handle: trimmed,
              redirect: window.location.href,
            });
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

export const AtmosphericHandleInfo = (props: { trigger?: React.ReactNode }) => {
  return (
    <Popover
      className="z-100! w-[min(24rem,var(--radix-popover-content-available-width))] flex flex-col"
      trigger={
        props.trigger ? (
          props.trigger
        ) : (
          <div className="text-accent-contrast text-sm mx-auto">
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
