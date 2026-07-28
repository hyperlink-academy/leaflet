"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { Modal } from "components/Modal";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster, useSmoker } from "components/Toast";
import { useIdentityData } from "components/IdentityProvider";
import { CheckTiny } from "components/Icons/CheckTiny";
import { EmailInput, EmailConfirm } from "components/Subscribe/EmailSubscribe";
import { HandleInput } from "components/Subscribe/HandleInput";
import { AtmosphericHandleInfo } from "components/Subscribe/HandleSubscribe";
import { SubscribeInputModeMenu } from "components/Subscribe/SubscribeButton";
import { LinkIdentityModal } from "components/Subscribe/LinkIdentityModal";
import { useViewerSubscription } from "components/Subscribe/viewerSubscription";
import { SUBSCRIBE_ERROR_MESSAGES } from "components/Subscribe/subscribeErrors";
import {
  TierGrid,
  isFreeTier,
  subscribeErrorMessage,
  type Tier,
  type Cadence,
} from "components/Memberships/TierGrid";
import { type JoinResume } from "components/Memberships/joinReturn";
import {
  getMembershipJoinViewer,
  createWalletCheckoutSession,
  subscribeToTier,
  saveWalletCardFromSession,
  type MembershipJoinViewer,
} from "actions/publications/joinMembership";
import { switchMembership } from "actions/memberships";
import {
  requestPublicationEmailSubscription,
  confirmPublicationEmailSubscription,
} from "actions/publications/subscribeEmail";
import {
  requestAuthEmailToken,
  confirmEmailAuthToken,
} from "actions/emailAuth";
import { loginWithEmailToken } from "actions/login";
import { getHomeDocs } from "app/(app)/(home-pages)/(writer)/home/storage";
import { subscribeToPublication } from "app/(app)/lish/subscribeToPublication";
import { buildOauthLoginUrl, mainSiteAuthBase } from "src/utils/customDomain";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { LoginModal } from "components/LoginButton";

// The identity input wrapper, so a missing-identity smoker can anchor to it.
const IDENTITY_INPUT_ID = "join-membership-identity-input";

// The paid subscribe flow:
//
// 1. collect who's subscribing (email or Atmosphere
// handle — or the session identity when signed in)
// 2. select a tier.
// 3. Picking a paid tier routes to payment:
// 3a. Straight to checkout if user is logged in w/ saved card
// 3b. Stripe's hosted card form if user us logged in w/ no card,
// 3c. Through sign-in/up first then to card form if user is logged out.
// email confirms with a code in this modal;
// handles round-trip through OAuth with the tier in the return URL).
export function JoinMembershipModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicationUri: string;
  publicationName: string;
  publicationUrl?: string;
  newsletterMode: boolean;
  tiers: Tier[];
  unlocksPost?: boolean;
  resume?: JoinResume | null;
  // Test-harness seam: supplies viewer state so the modal doesn't fetch it.
  viewerOverride?: MembershipJoinViewer;
}) {
  const toaster = useToaster();
  const smoker = useSmoker();
  const router = useRouter();
  const { identity } = useIdentityData();
  const viewerSub = useViewerSubscription(props.publicationUri);
  const [viewer, setViewer] = useState<MembershipJoinViewer | null>(
    props.viewerOverride ?? null,
  );
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [mode, setMode] = useState<"email" | "atproto">(
    props.newsletterMode ? "email" : "atproto",
  );
  const [cadence, setCadence] = useState<Cadence>("month");
  const [busyTierId, setBusyTierId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmStep, setConfirmStep] = useState<
    | { kind: "authToken"; tokenId: string; tier: Tier }
    | { kind: "pubCode"; tier: Tier }
    | null
  >(null);
  // Signed in but missing the identity being subscribed with — the tier we
  // continue to once the reader confirms linking it (mirrors SubscribeInput).
  const [linkTier, setLinkTier] = useState<Tier | null>(null);
  // Set when the reader picks a tier before typing their email/handle: rings
  // the input instead of firing a toast, and clears when they focus it.
  const [inputMissing, setInputMissing] = useState(false);
  const resumeHandled = useRef(false);

  const effectiveCadence = (tier: Tier): Cadence =>
    tier.annual_price_cents != null ? cadence : "month";
  const isSubscribed = props.newsletterMode
    ? viewerSub.emailSubscribed
    : viewerSub.atprotoSubscribed;
  const hasNeededIdentity = props.newsletterMode
    ? !!identity?.email
    : !!identity?.bsky_profiles?.handle;
  const subscribingAs =
    identity && hasNeededIdentity
      ? props.newsletterMode
        ? identity.email
        : `@${identity.bsky_profiles?.handle}`
      : null;

  useEffect(() => {
    if (!props.open || props.viewerOverride) return;
    let cancelled = false;
    getMembershipJoinViewer(props.publicationUri).then((v) => {
      if (!cancelled) setViewer(v);
    });
    return () => {
      cancelled = true;
    };
  }, [props.open, props.publicationUri]);

  // Reload the page the reader joined from so it re-renders with member
  // access (e.g. the full gated post); also the return target for redirects.
  const currentPageUrl = () =>
    window.location.origin + window.location.pathname;

  const subscribeAction = () =>
    encodeActionToSearchParam({
      action: "subscribe",
      publication: props.publicationUri,
    });

  // Where sign-in should land: back here, carrying the picked tier for paid
  // joins so payment resumes (free joins are done once the after-sign-in
  // subscribe action runs).
  const joinReturnUrl = (tier: Tier) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("join_tier");
    url.searchParams.delete("join_cadence");
    if (!isFreeTier(tier)) {
      url.searchParams.set("join_tier", tier.id);
      url.searchParams.set("join_cadence", effectiveCadence(tier));
    }
    return url.toString();
  };

  const finishJoin = (message: string) => {
    toaster({ type: "success", content: message });
    props.onOpenChange(false);
    setBusyTierId(null);
    mutate("identity");
    router.refresh();
  };

  // Creates the subscription with the saved card and acts on the result.
  // Returns "navigating" when it sends the browser elsewhere (success or
  // hosted-invoice fallback), so callers keep their spinner.
  const runSubscribe = async (
    tierId: string,
    joinCadence: Cadence,
  ): Promise<"navigating" | "error"> => {
    const res = await subscribeToTier({
      publicationUri: props.publicationUri,
      tierId,
      cadence: joinCadence,
    });
    if (!res.ok) {
      toaster({ type: "error", content: subscribeErrorMessage(res.error) });
      return "error";
    }
    const { status, hostedInvoiceUrl } = res.value;
    if (status === "active" || status === "trialing") {
      toaster({
        type: "success",
        content: `Welcome to ${props.publicationName}!`,
      });
      window.location.href = currentPageUrl();
      return "navigating";
    }
    // Authentication needed or the charge was declined: finish on Stripe's page.
    if (hostedInvoiceUrl) {
      window.location.href = hostedInvoiceUrl;
      return "navigating";
    }
    toaster({
      type: "error",
      content: "We couldn't complete your payment. Please try again!",
    });
    return "error";
  };

  const payWithViewer = async (
    tier: Tier,
    v?: MembershipJoinViewer | null,
    cadenceOverride?: Cadence | null,
  ) => {
    setBusyTierId(tier.id);
    const joinCadence = cadenceOverride ?? effectiveCadence(tier);
    const resolved =
      v ?? viewer ?? (await getMembershipJoinViewer(props.publicationUri));
    if (!viewer) setViewer(resolved);
    if (!resolved.walletCard?.last4) {
      const res = await createWalletCheckoutSession({
        returnUrl: currentPageUrl(),
        tierId: tier.id,
        cadence: joinCadence,
      });
      if (!res.ok) {
        setBusyTierId(null);
        toaster({
          type: "error",
          content: "We couldn't open the checkout form. Please try again!",
        });
        return;
      }
      window.location.href = res.value.url;
      return;
    }
    const outcome = await runSubscribe(tier.id, joinCadence);
    if (outcome === "error") setBusyTierId(null);
  };

  // Returning from card setup or sign-in: finish what the reader started.
  useEffect(() => {
    const resume = props.resume;
    if (!props.open || !resume || resumeHandled.current) return;
    resumeHandled.current = true;
    (async () => {
      setProcessing(true);
      if (resume.kind === "wallet") {
        const res = await saveWalletCardFromSession(resume.sessionId);
        if (!res.ok) {
          setProcessing(false);
          toaster({
            type: "error",
            content: "We couldn't save your card. Please try again!",
          });
          return;
        }
        if (resume.tierId && resume.cadence) {
          const outcome = await runSubscribe(resume.tierId, resume.cadence);
          if (outcome === "navigating") return; // keep the spinner while we leave
        }
        setViewer(await getMembershipJoinViewer(props.publicationUri));
        setProcessing(false);
      } else {
        // Back from sign-in with a tier picked; the after-sign-in action
        // already subscribed them, so pick the payment back up.
        const v = await getMembershipJoinViewer(props.publicationUri);
        setViewer(v);
        const tier = props.tiers.find((t) => t.id === resume.tierId);
        if (resume.cadence === "year") setCadence("year");
        setProcessing(false);
        if (!v.loggedIn || !tier) return;
        await payWithViewer(tier, v, resume.cadence);
      }
    })();
  }, [props.open, props.resume]);

  // One-click free join for a signed-in reader who has the needed identity.
  const freeJoin = async (tier: Tier) => {
    setBusyTierId(tier.id);
    if (props.newsletterMode && identity?.email) {
      const res = await requestPublicationEmailSubscription(
        props.publicationUri,
        identity.email,
      );
      if (!res.ok) {
        setBusyTierId(null);
        toaster({
          type: "error",
          content: SUBSCRIBE_ERROR_MESSAGES[res.error],
        });
        return;
      }
    } else {
      const res = await subscribeToPublication(
        props.publicationUri,
        window.location.href,
      );
      if (!res.success) {
        setBusyTierId(null);
        toaster({
          type: "error",
          content: "We couldn't subscribe you. Try again.",
        });
        return;
      }
    }
    finishJoin("You're subscribed!");
  };

  // Prorated in-place switch for an active paid membership.
  const runSwitch = async (tier: Tier) => {
    const m = viewer?.membership;
    if (!m) return;
    setBusyTierId(tier.id);
    const res = await switchMembership({
      membershipId: m.id,
      tierId: tier.id,
      cadence: effectiveCadence(tier),
    });
    setBusyTierId(null);
    if (!res.ok) {
      toaster({
        type: "error",
        content: "We couldn't switch your plan. Please try again!",
      });
      return;
    }
    finishJoin("Updated your plan!");
  };

  // Signed-out email joins mint a session with an auth code confirmed right in
  // this modal — except on custom domains, where sessions are first-party on
  // the main site, so we bounce through its email login instead.
  const startEmailAuth = async (tier: Tier) => {
    const base = mainSiteAuthBase();
    if (base) {
      setBusyTierId(tier.id);
      const url = new URL("/api/auth/email-login", base);
      url.searchParams.set("email", email);
      url.searchParams.set("redirect", joinReturnUrl(tier));
      url.searchParams.set("action", subscribeAction());
      window.location.href = url.toString();
      return;
    }
    setBusyTierId(tier.id);
    try {
      const tokenId = await requestAuthEmailToken(email, {
        publicationName: props.publicationName,
        publicationUrl: props.publicationUrl,
      });
      setConfirmStep({ kind: "authToken", tokenId, tier });
    } catch {
      toaster({
        type: "error",
        content: "We couldn't send the email. Please try again!",
      });
    }
    setBusyTierId(null);
  };

  const redirectToOauthJoin = (tier: Tier, link: boolean) => {
    setBusyTierId(tier.id);
    window.location.href = buildOauthLoginUrl({
      handle: handle.trim(),
      redirect: joinReturnUrl(tier),
      action: subscribeAction(),
      link,
      autoMerge: link,
    });
  };

  // The signed-in-but-linking email path: the publication confirmation code
  // attaches the typed email to the current identity on confirm.
  const sendPubCode = async (tier: Tier) => {
    setBusyTierId(tier.id);
    const res = await requestPublicationEmailSubscription(
      props.publicationUri,
      email,
    );
    setBusyTierId(null);
    if (!res.ok) {
      toaster({ type: "error", content: SUBSCRIBE_ERROR_MESSAGES[res.error] });
      return;
    }
    if (res.value.confirmed) {
      if (isFreeTier(tier)) finishJoin("You're subscribed!");
      else await payAfterIdentityChange(tier);
      return;
    }
    setConfirmStep({ kind: "pubCode", tier });
  };

  // The session identity just changed (login or link) — refetch wallet and
  // membership before routing to payment.
  const payAfterIdentityChange = async (tier: Tier) => {
    mutate("identity");
    const v = await getMembershipJoinViewer(props.publicationUri);
    setViewer(v);
    await payWithViewer(tier, v);
  };

  const submitCode = async (code: string) => {
    if (!confirmStep || confirming) return;
    setConfirming(true);
    const tier = confirmStep.tier;
    if (confirmStep.kind === "authToken") {
      const token = await confirmEmailAuthToken(confirmStep.tokenId, code);
      if (!token) {
        setConfirming(false);
        toaster({ type: "error", content: "Incorrect code!" });
        return;
      }
      // Local pre-login drafts belong to whoever first signs in on this browser.
      await loginWithEmailToken(getHomeDocs().filter((l) => !l.hidden));
      mutate("identity");
      // Subscribe the fresh session to the publication (instant — emails match).
      const sub = await requestPublicationEmailSubscription(
        props.publicationUri,
        email,
      );
      if (!sub.ok) {
        setConfirming(false);
        toaster({
          type: "error",
          content: SUBSCRIBE_ERROR_MESSAGES[sub.error],
        });
        return;
      }
    } else {
      const res = await confirmPublicationEmailSubscription(
        props.publicationUri,
        email,
        code,
        true,
      );
      if (!res.ok) {
        setConfirming(false);
        toaster({
          type: "error",
          content: SUBSCRIBE_ERROR_MESSAGES[res.error],
        });
        return;
      }
    }
    setConfirming(false);
    setConfirmStep(null);
    if (isFreeTier(tier)) {
      finishJoin("You're subscribed!");
      return;
    }
    await payAfterIdentityChange(tier);
  };

  const selectTier = async (tier: Tier) => {
    if (busyTierId || processing) return;
    const free = isFreeTier(tier);

    // An active paid membership switches in place (prorated); everyone else —
    // including free-tier subscribers upgrading — goes through the payment
    // flow, since the free tier has no Stripe subscription to switch from.
    if (viewer?.membership && !free) return runSwitch(tier);

    if (identity) {
      if (hasNeededIdentity) return free ? freeJoin(tier) : payWithViewer(tier);
      if (mode === "email" ? !validEmail(email) : !handle.trim())
        return flagMissingIdentity();
      setLinkTier(tier);
      return;
    }

    // Logged out: sign in/up with the typed identity first, then pay.
    if (mode === "email") {
      if (!validEmail(email)) return flagMissingIdentity();
      return startEmailAuth(tier);
    }
    if (!handle.trim()) return flagMissingIdentity();
    redirectToOauthJoin(tier, false);
  };

  // Picked a tier before entering an email/handle: ring the input and pop an
  // error smoker anchored to it (so it reads even if the input is scrolled to).
  const flagMissingIdentity = () => {
    setInputMissing(true);
    const rect = document
      .getElementById(IDENTITY_INPUT_ID)
      ?.getBoundingClientRect();
    smoker({
      error: true,
      text:
        mode === "email"
          ? "enter your email first!"
          : "enter your handle first!",
      position: { x: rect ? rect.left + 12 : 0, y: rect ? rect.top : 0 },
    });
  };

  const modeMenu = <SubscribeInputModeMenu mode={mode} onChange={setMode} />;

  return (
    <>
      <Modal
        open={props.open}
        onOpenChange={props.onOpenChange}
        className="max-w-full w-fit p-4 pt-3 sm:p-6 sm:pt-5"
      >
        {processing ? (
          <div className="px-4 py-8 flex flex-col items-center gap-2">
            <DotLoader />
            <div className="text-secondary text-sm">
              Completing your membership…
            </div>
          </div>
        ) : confirmStep ? (
          <div className="flex justify-center">
            <EmailConfirm
              autoFocus
              loading={confirming}
              emailValue={email}
              onBack={() => setConfirmStep(null)}
              onSubmit={submitCode}
            />
          </div>
        ) : viewer?.isOwner ? (
          <div className="px-4 py-6 text-center text-secondary">
            This is your publication — readers see your membership tiers here.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-center flex flex-col gap-1 max-w-md mx-auto">
              <h2 className="text-primary leading-snug text-xl">
                Become a member of <br />
                {props.publicationName}
              </h2>
            </div>
            {subscribingAs ? (
              <p className="text-tertiary text-sm text-center">
                Subscribing as {subscribingAs}
              </p>
            ) : (
              <div
                id={IDENTITY_INPUT_ID}
                className="flex flex-col gap-1 max-w-sm w-full mx-auto"
              >
                {props.newsletterMode && mode === "email" ? (
                  <EmailInput
                    value={email}
                    onChange={setEmail}
                    leading={modeMenu}
                    highlight={inputMissing}
                    onFocus={() => setInputMissing(false)}
                  />
                ) : (
                  <>
                    <HandleInput
                      onChange={setHandle}
                      // Selecting a suggestion just stores the handle — the
                      // tier buttons drive the actual submit.
                      onSubmit={setHandle}
                      leading={props.newsletterMode ? modeMenu : undefined}
                      highlight={inputMissing}
                      onFocus={() => setInputMissing(false)}
                    />
                    <div className="text-center pt-1">
                      <AtmosphericHandleInfo />
                    </div>
                  </>
                )}
                {inputMissing ? (
                  <p className="text-accent-contrast text-xs text-center font-bold">
                    {props.newsletterMode && mode === "email"
                      ? "Enter your email"
                      : "Enter your Atmosphere handle."}
                  </p>
                ) : (
                  <div className="spacer h-4.5" />
                )}
              </div>
            )}
            <TierGrid
              tiers={props.tiers}
              cadence={cadence}
              onCadenceChange={setCadence}
              busyTierId={busyTierId}
              isSubscribed={isSubscribed}
              currentTierId={viewer?.membership?.tierId}
              unlocksPost={props.unlocksPost}
              onSelectTier={selectTier}
              renderFreeAction={() =>
                isSubscribed ? (
                  <div className="text-accent-contrast font-bold text-sm flex items-center gap-1 justify-center">
                    <CheckTiny /> Subscribed
                  </div>
                ) : undefined
              }
            />{" "}
            <p className="text-tertiary text-sm text-center">
              {viewer?.membership ? (
                "Switching memberships will prorate your bill this month."
              ) : viewer?.walletCard?.last4 ? (
                `Bill to card ending in ${viewer.walletCard.last4}`
              ) : (
                <>
                  Already Subscribed?{" "}
                  <LoginModal
                    trigger={<div className="underline">Sign in</div>}
                  />
                </>
              )}
            </p>
          </div>
        )}
      </Modal>
      {linkTier && identity && (
        <LinkIdentityModal
          open
          onOpenChange={(open) => {
            if (!open) setLinkTier(null);
          }}
          signedInAs={
            identity.bsky_profiles?.handle
              ? `@${identity.bsky_profiles.handle}`
              : identity.email || "your account"
          }
          linkingIdentity={mode === "email" ? email : `@${handle.trim()}`}
          confirmButtonLabel={mode === "email" ? "Link email" : "Link Bluesky"}
          confirming={busyTierId !== null}
          onConfirm={async () => {
            const tier = linkTier;
            setLinkTier(null);
            if (mode === "email") await sendPubCode(tier);
            else redirectToOauthJoin(tier, true);
          }}
        />
      )}
    </>
  );
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
