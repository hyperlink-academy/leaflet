"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Modal } from "components/Modal";
import { useToaster, useSmoker } from "components/Toast";
import { useIdentityData } from "components/IdentityProvider";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { EmailInput, EmailConfirm } from "components/Subscribe/EmailSubscribe";
import { EmailSubscribeSuccess } from "components/Subscribe/EmailSubscribeSuccess";
import { useSubscribeSuccessData } from "components/Subscribe/useSubscribeSuccessData";
import { HandleSearchInput } from "components/HandleSearchInput";
import {
  AtmosphericHandleInfo,
  AtSubscribeSuccess,
} from "components/Subscribe/HandleSubscribe";
import { SubscribeInputModeMenu } from "components/Subscribe/SubscribeButton";
import { LinkIdentityModal } from "components/Subscribe/LinkIdentityModal";
import { useViewerSubscription } from "components/Subscribe/viewerSubscription";
import { SUBSCRIBE_ERROR_MESSAGES } from "components/Subscribe/subscribeErrors";
import {
  TierGrid,
  isFreeTier,
  subscribeErrorMessage,
  tierPriceLabel,
  type Tier,
  type Cadence,
} from "components/Memberships/TierGrid";
import { type JoinResume } from "components/Memberships/joinReturn";
import {
  useSwitchPreview,
  SwitchPreviewLine,
} from "components/Memberships/switchPreview";
import {
  getMembershipJoinViewer,
  subscribeToTier,
  saveWalletCardFromSession,
  type MembershipJoinViewer,
} from "actions/publications/joinMembership";
import { saveWalletCardFromSetupIntent } from "actions/walletPayment";
import { WalletPaymentForm } from "components/Payments/WalletPaymentForm";
import {
  downgradeMembershipToFree,
  switchMembership,
} from "actions/memberships";
import {
  requestPublicationEmailSubscription,
  confirmPublicationEmailSubscription,
} from "actions/publications/subscribeEmail";
import {
  requestAuthEmailToken,
  confirmEmailAuthToken,
} from "actions/emailAuth";
import { loginWithEmailToken } from "actions/login";
import { getHomeDocs } from "src/utils/homeDocsStorage";
import { subscribeToPublication } from "actions/publications/subscribeToPublication";
import { buildOauthLoginUrl, mainSiteAuthBase } from "src/utils/customDomain";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import type { SubscriptionSource } from "src/subscriptionSource";
import { LoginModal } from "components/LoginButton";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";

// 1. collect who's subscribing (email or Atmosphere
// handle — or the session identity when signed in)
// 2. select a tier.
// 3. Picking a paid tier routes to payment:
// 3a. Straight to checkout if user is logged in w/ saved card
// 3b. Stripe's hosted card form if user us logged in w/ no card,
// 3c. Through sign-in/up first then to card form if user is logged out.
// email confirms with a code inline;
// handles round-trip through OAuth with the tier in the return URL).
export function JoinMembershipFlow(props: {
  // Whether the flow is live: gates the viewer fetch and resume handling so a
  // closed modal doesn't work in the background. The /join page passes true.
  active: boolean;
  // Called on a completed join that stays on the page (free join, plan
  // switch) — the modal closes itself; the /join page has nothing to close.
  onClose?: () => void;
  publicationUri: string;
  publicationName: string;
  publicationUrl?: string;
  newsletterMode: boolean;
  tiers: Tier[];
  unlocksPost?: boolean;
  unlocksPostTierIds?: string[] | null;
  resume?: JoinResume | null;
  // Analytics: where the join flow was opened from.
  source?: SubscriptionSource;
  // Test-harness seam: supplies viewer state so the flow doesn't fetch it.
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
  const [inputMissing, setInputMissing] = useState(false);
  // An active paid member picked the free tier — confirm before we schedule
  // the cancellation (irreversible-feeling, so it isn't one click).
  const [confirmDowngrade, setConfirmDowngrade] = useState<Tier | null>(null);
  // An active paid member picked another paid tier — confirm against a quote,
  // since a monthly↔annual switch bills on the spot.
  const [confirmSwitch, setConfirmSwitch] = useState<Tier | null>(null);
  // The embedded payment step for a picked paid tier: the reader confirms a
  // payment method in the Payment Element, then the subscription is created.
  const [cardStep, setCardStep] = useState<{
    tier: Tier;
    cadence: Cadence;
  } | null>(null);
  // A paid join completed — the flow shows the subscribe success screen in
  // place of the tier grid until the reader dismisses it.
  const [joined, setJoined] = useState(false);
  const resumeHandled = useRef(false);
  // Warm the success-screen data (pub name + recommended listings) while the
  // flow is open, so completing a join doesn't flash a loading spinner.
  useSubscribeSuccessData(props.active ? props.publicationUri : undefined);

  const effectiveCadence = (tier: Tier): Cadence =>
    tier.annual_price_cents != null ? cadence : "month";
  const isSubscribed = viewerSub.subscribed;
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
    if (!props.active || props.viewerOverride) return;
    let cancelled = false;
    getMembershipJoinViewer(props.publicationUri).then((v) => {
      if (!cancelled) setViewer(v);
    });
    return () => {
      cancelled = true;
    };
  }, [props.active, props.publicationUri]);

  // A join can entitle the viewer to gated posts — revalidate any members-only
  // unlock islands on the page (keyed in PostDataProvider) so the full post
  // renders in place instead of behind the paywall.
  const revalidateUnlocks = () =>
    mutate((key) => Array.isArray(key) && key[0] === "unlocked-post");

  const subscribeAction = () =>
    encodeActionToSearchParam({
      action: "subscribe",
      publication: props.publicationUri,
      // The subscribe completes after a redirect, so stamp the originating
      // page into the source now.
      ...(props.source
        ? { source: { url: window.location.href, ...props.source } }
        : {}),
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
    props.onClose?.();
    setBusyTierId(null);
    mutate("identity");
    revalidateUnlocks();
    router.refresh();
  };

  // Creates the subscription with the saved card and acts on the result.
  // Returns "navigating" when it sends the browser elsewhere (the
  // hosted-invoice fallback), so callers keep their spinner; "success" shows
  // the subscribe success screen in place.
  const runSubscribe = async (
    tierId: string,
    joinCadence: Cadence,
  ): Promise<"success" | "navigating" | "error"> => {
    const res = await subscribeToTier({
      publicationUri: props.publicationUri,
      tierId,
      cadence: joinCadence,
      source: props.source
        ? { url: window.location.href, ...props.source }
        : undefined,
    });
    if (!res.ok) {
      toaster({ type: "error", content: subscribeErrorMessage(res.error) });
      return "error";
    }
    const { status, hostedInvoiceUrl } = res.value;
    if (status === "active" || status === "trialing") {
      setJoined(true);
      mutate("identity");
      revalidateUnlocks();
      router.refresh();
      return "success";
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

  // Paid tiers go through the embedded card step: the Payment Element shows
  // the wallet's saved payment methods (and Link) so the reader picks how to
  // pay before the subscription is created.
  const payWithViewer = async (
    tier: Tier,
    v?: MembershipJoinViewer | null,
    cadenceOverride?: Cadence | null,
  ) => {
    const joinCadence = cadenceOverride ?? effectiveCadence(tier);
    if (v && !viewer) setViewer(v);
    setCardStep({ tier, cadence: joinCadence });
  };

  // The Payment Element confirmed a setup: make that method the wallet
  // default, then charge the join. On a charge failure the step closes (the
  // SetupIntent is spent, so the form can't just be resubmitted) — the card
  // is saved, and retrying from the tier grid mints a fresh intent.
  const completeCardStep = async (setupIntentId: string) => {
    if (!cardStep) return;
    const saved = await saveWalletCardFromSetupIntent(setupIntentId);
    if (!saved.ok) {
      toaster({
        type: "error",
        content: "We couldn't save your payment method. Please try again!",
      });
      setCardStep(null);
      return;
    }
    const outcome = await runSubscribe(cardStep.tier.id, cardStep.cadence);
    if (outcome !== "navigating") setCardStep(null);
  };

  // Returning from card setup or sign-in: finish what the reader started.
  useEffect(() => {
    const resume = props.resume;
    if (!props.active || !resume || resumeHandled.current) return;
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
          if (outcome === "success") {
            setProcessing(false);
            return;
          }
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
  }, [props.active, props.resume]);

  // One-click free join for a signed-in reader who has the needed identity.
  const freeJoin = async (tier: Tier) => {
    setBusyTierId(tier.id);
    if (props.newsletterMode && identity?.email) {
      const res = await requestPublicationEmailSubscription(
        props.publicationUri,
        identity.email,
        props.source,
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
        props.source,
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
    setConfirmSwitch(null);
    finishJoin("Updated your plan!");
  };

  // Paid access runs to the period's end, so the reader stays a member for now
  // and lands on free after — the server owns both halves of that transition.
  const downgradeToFree = async (tier: Tier) => {
    const m = viewer?.membership;
    if (!m) return;
    setBusyTierId(tier.id);
    const res = await downgradeMembershipToFree({
      membershipId: m.id,
      publicationUri: props.publicationUri,
      newsletterMode: props.newsletterMode,
    });
    if (!res.ok) {
      setBusyTierId(null);
      toaster({
        type: "error",
        content: "We couldn't downgrade your plan. Please try again!",
      });
      return;
    }
    setConfirmDowngrade(null);
    finishJoin(
      res.value.subscribed
        ? "You'll move to the free plan at the end of your billing period."
        : "Your membership expires at the end of your billing period.",
    );
  };

  // Signed-out email joins mint a session with an auth code confirmed right
  // here — except on custom domains, where sessions are first-party on the
  // main site, so we bounce through its email login instead.
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
      props.source,
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
        props.source,
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
        props.source,
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

    // An active paid membership switches in place (prorated) between paid
    // tiers, or downgrades to free (that path cancels the Stripe subscription
    // instead of switching it). Both go through a confirm step first.
    if (viewer?.membership)
      return free ? setConfirmDowngrade(tier) : setConfirmSwitch(tier);

    if (identity) {
      if (hasNeededIdentity) return free ? freeJoin(tier) : payWithViewer(tier);
      if (mode === "email" ? !validEmail(email) : !handle.trim())
        return setInputMissing(true);
      setLinkTier(tier);
      return;
    }

    // Logged out: sign in/up with the typed identity first, then pay.
    if (mode === "email") {
      if (!validEmail(email)) return setInputMissing(true);
      return startEmailAuth(tier);
    }
    if (!handle.trim()) return setInputMissing(true);
    redirectToOauthJoin(tier, false);
  };

  const modeMenu = <SubscribeInputModeMenu mode={mode} onChange={setMode} />;

  return (
    <>
      {joined ? (
        props.newsletterMode ? (
          <EmailSubscribeSuccess
            email={identity?.email ?? undefined}
            handle={identity?.bsky_profiles?.handle ?? undefined}
            publicationUri={props.publicationUri}
          />
        ) : (
          <AtSubscribeSuccess publicationUri={props.publicationUri} />
        )
      ) : processing ? (
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
      ) : cardStep ? (
        <div className="flex flex-col gap-3 max-w-sm w-full mx-auto">
          <div className="text-center flex flex-col gap-1">
            <h2 className="text-primary leading-snug text-xl">
              Join {props.publicationName}
            </h2>
            <p className="text-secondary">
              {cardStep.tier.name} ·{" "}
              {tierPriceLabel(cardStep.tier, cardStep.cadence)}
            </p>
          </div>
          <WalletPaymentForm
            submitLabel={`Join for ${tierPriceLabel(cardStep.tier, cardStep.cadence)}`}
            email={identity?.email}
            onSuccess={completeCardStep}
            onCancel={() => setCardStep(null)}
          />
        </div>
      ) : viewer?.isOwner ? (
        <div className="px-4 py-6 text-center text-secondary">
          This is your publication — readers see your membership tiers here.
        </div>
      ) : (
        <div className="memberSignUp flex flex-col max-w-3xl">
          <div className="text-center flex flex-col gap-1 max-w-md mx-auto">
            <h2 className="text-primary leading-snug text-xl">
              Become a member of <br />
              {props.publicationName}
            </h2>
          </div>
          {subscribingAs ? (
            <p className="text-tertiary text-lg text-center pt-1 pb-4">
              Subscribe as {subscribingAs}
            </p>
          ) : (
            <div className="flex flex-col gap-1 max-w-sm w-full mx-auto pt-3 pb-3">
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
                  <HandleSearchInput
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
            unlocksPostTierIds={props.unlocksPostTierIds}
            onSelectTier={selectTier}
          />{" "}
          {viewer?.membership ? (
            <p className="tierPaymentInfo text-tertiary text-sm text-center pt-4">
              Switching memberships prorates your bill — pick a plan to see what
              it costs before confirming.
            </p>
          ) : !identity ? (
            <p className="tierPaymentInfo text-tertiary text-sm text-center pt-4">
              Already Subscribed?{" "}
              <LoginModal trigger={<div className="underline">Sign in</div>} />
            </p>
          ) : null}
        </div>
      )}
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
      {confirmSwitch && viewer?.membership && (
        <SwitchConfirmModal
          membershipId={viewer.membership.id}
          currentTier={props.tiers.find(
            (t) => t.id === viewer.membership?.tierId,
          )}
          newTier={confirmSwitch}
          cadence={effectiveCadence(confirmSwitch)}
          busy={busyTierId !== null}
          onConfirm={() => runSwitch(confirmSwitch)}
          onClose={() => setConfirmSwitch(null)}
        />
      )}
      {confirmDowngrade && (
        <DowngradeConfirmModal
          currentTier={props.tiers.find(
            (t) => t.id === viewer?.membership?.tierId,
          )}
          currentCadence={
            viewer?.membership?.cadence === "year" ? "year" : "month"
          }
          freeTier={confirmDowngrade}
          periodEnd={viewer?.membership?.currentPeriodEnd ?? null}
          busy={busyTierId !== null}
          onConfirm={() => downgradeToFree(confirmDowngrade)}
          onClose={() => setConfirmDowngrade(null)}
        />
      )}
    </>
  );
}

function SwitchConfirmModal(props: {
  membershipId: string;
  currentTier: Tier | undefined;
  newTier: Tier;
  cadence: Cadence;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const preview = useSwitchPreview({
    enabled: true,
    membershipId: props.membershipId,
    tierId: props.newTier.id,
    cadence: props.cadence,
  });

  return (
    <Modal
      open
      onOpenChange={(o) => !o && props.onClose()}
      title="Switch your Membership"
      className="max-w-full w-sm bg-[var(--color-bg-light)]! text-center"
    >
      <div className="flex flex-col gap-3">
        <div className="text-secondary leading-snug">
          <div className="flex flex-col justify-center items-center mx-auto gap-1 pt-2">
            {props.currentTier && (
              <>
                <div className="opaque-container w-fit py-0.5 px-2 text-tertiary">
                  {props.currentTier.name} ·{" "}
                  {tierPriceLabel(props.currentTier, props.cadence)}
                </div>
                <GoToArrowLined className="rotate-90 text-tertiary" />
              </>
            )}
            <div className="accent-container w-fit py-0.5 px-2 font-bold text-accent-contrast border border-accent-contrast">
              {props.newTier.name} ·{" "}
              {tierPriceLabel(props.newTier, props.cadence)}
            </div>
          </div>
        </div>
        <SwitchPreviewLine state={preview} className="text-tertiary text-sm " />
        <div className="flex gap-3 mx-auto">
          <ButtonTertiary type="button" onClick={props.onClose}>
            Nevermind{" "}
          </ButtonTertiary>
          <ButtonPrimary
            type="button"
            disabled={props.busy || preview?.status === "loading"}
            onClick={props.onConfirm}
          >
            {props.busy ? <DotLoader /> : "Switch!"}
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
  );
}

function DowngradeConfirmModal(props: {
  currentTier: Tier | undefined;
  currentCadence: Cadence;
  freeTier: Tier;
  periodEnd: string | null;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const endDate = useLocalizedDate(
    props.periodEnd ?? "",
    DOWNGRADE_DATE_FORMAT,
  );

  return (
    <Modal
      open
      onOpenChange={(o) => !o && props.onClose()}
      title="Switch your Membership"
      className="max-w-full w-sm bg-[var(--color-bg-light)]! text-center"
    >
      <div className="flex flex-col gap-3">
        <div className="text-secondary leading-snug">
          <div className="flex flex-col justify-center items-center mx-auto gap-1 pt-2">
            {props.currentTier && (
              <>
                <div className="opaque-container w-fit py-0.5 px-2 text-tertiary">
                  {props.currentTier.name} ·{" "}
                  {tierPriceLabel(props.currentTier, props.currentCadence)}
                </div>
                <GoToArrowLined className="rotate-90 text-tertiary" />
              </>
            )}
            <div className="accent-container w-fit py-0.5 px-2 font-bold text-accent-contrast border border-accent-contrast">
              {props.freeTier.name} · Free
            </div>
          </div>
        </div>
        <div className="text-tertiary text-sm">
          You'll keep member access{" "}
          {props.periodEnd
            ? `until ${endDate}`
            : "until the end of your billing period"}
        </div>
        <div className="flex gap-3 mx-auto">
          <ButtonTertiary type="button" onClick={props.onClose}>
            Nevermind
          </ButtonTertiary>
          <ButtonPrimary
            type="button"
            disabled={props.busy}
            onClick={props.onConfirm}
          >
            {props.busy ? <DotLoader /> : "Switch!"}
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
  );
}

const DOWNGRADE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
