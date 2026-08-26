"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { DotLoader } from "components/utils/DotLoader";
import { Modal } from "components/Modal";
import { useToaster, useSmoker } from "components/Toast";
import { useIdentityData } from "components/IdentityProvider";
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
  effectiveCadence,
  membershipPlanKey,
  subscribeErrorMessage,
  tierPriceLabel,
  type MembershipPlan,
  type Cadence,
} from "components/Memberships/TierGrid";
import type { GatePolicy, MembershipTiers, PaidTier } from "src/membership";
import { type JoinResume } from "components/Memberships/joinReturn";
import { revalidateUnlocks } from "components/Memberships/revalidateUnlocks";
import {
  getMembershipJoinViewer,
  subscribeToTier,
  saveWalletCardFromSession,
  type MembershipJoinViewer,
} from "actions/publications/joinMembership";
import { saveWalletCardFromSetupIntent } from "actions/walletPayment";
import { WalletPaymentForm } from "components/Payments/WalletPaymentForm";
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
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useMyMembership } from "components/Memberships/useMyMembership";
import {
  ChangePlanForm,
  isMembershipActive,
  membershipPrice,
  pendingPlanLabel,
} from "components/Memberships/ChangePlanModal";
import { CancelMembershipForm } from "components/Memberships/CancelMembershipModal";
import { ResumeMembershipForm } from "components/Memberships/ResumeMembershipModal";
import type { MyMembership } from "actions/memberships";

// 1. collect who's subscribing (email or Atmosphere
// handle — or the session identity when signed in)
// 2. select a tier.
// 3. Picking a paid tier routes to payment:
// 3a. Straight to checkout if user is logged in w/ saved card
// 3b. Stripe's hosted card form if user us logged in w/ no card,
// 3c. Through sign-in/up first then to card form if user is logged out.
// email confirms with a code inline;
// handles round-trip through OAuth with the tier in the return URL).
//
// The tier grid always renders; the viewer's state only changes what the
// buttons do. Paid members get the same grid as a plan switcher
// (ChangePlanForm) plus cancel/resume, so the page and modal are one surface.
export function JoinMembershipFlow(props: {
  // Whether the flow is live: gates the viewer fetch and resume handling so a
  // closed modal doesn't work in the background. The /join page passes true.
  active: boolean;
  // Called on a completed join that stays on the page (free join, plan
  // change) — the modal closes itself; the /join page has nothing to close.
  onClose?: () => void;
  publicationUri: string;
  publicationName: string;
  publicationUrl?: string;
  newsletterMode: boolean;
  tiers: MembershipTiers;
  gatePolicy?: GatePolicy | null;
  resume?: JoinResume | null;
  // Analytics: where the join flow was opened from.
  source?: SubscriptionSource;
  // Test-harness seam: supplies viewer state so the flow doesn't fetch it.
  viewerOverride?: MembershipJoinViewer;
}) {
  const toaster = useToaster();
  const smoker = useSmoker();
  const router = useRouter();
  const { identity, identityPending } = useIdentityData();
  const viewerSub = useViewerSubscription(props.publicationUri);
  const { membership: myMembership } = useMyMembership(props.publicationUri);
  const isPaidMember = viewerSub.membership?.kind === "paid";
  const [manageStep, setManageStep] = useState<"cancel" | "resume" | null>(
    null,
  );
  // Remounts ChangePlanForm off its "updated" screen when there's no modal
  // to close.
  const [changeKey, setChangeKey] = useState(0);
  const [viewer, setViewer] = useState<MembershipJoinViewer | null>(
    props.viewerOverride ?? null,
  );
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [mode, setMode] = useState<"email" | "atproto">(
    props.newsletterMode ? "email" : "atproto",
  );
  const [cadence, setCadence] = useState<Cadence>("month");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmStep, setConfirmStep] = useState<
    | { kind: "authToken"; tokenId: string; plan: MembershipPlan }
    | { kind: "pubCode"; plan: MembershipPlan }
    | null
  >(null);
  // Signed in but missing the identity being subscribed with — the tier we
  // continue to once the reader confirms linking it (mirrors SubscribeInput).
  const [linkPlan, setLinkPlan] = useState<MembershipPlan | null>(null);
  const [inputMissing, setInputMissing] = useState(false);

  const [cardStep, setCardStep] = useState<{
    tier: PaidTier;
    cadence: Cadence;
  } | null>(null);
  // A paid join completed — the flow shows the subscribe success screen in
  // place of the tier grid until the reader dismisses it.
  const [joined, setJoined] = useState(false);
  const resumeHandled = useRef(false);
  // Warm the success-screen data (pub name + recommended listings) while the
  // flow is open, so completing a join doesn't flash a loading spinner.
  useSubscribeSuccessData(props.active ? props.publicationUri : undefined);

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
  const joinReturnUrl = (plan: MembershipPlan) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("join_tier");
    url.searchParams.delete("join_cadence");
    if (plan.kind === "paid") {
      url.searchParams.set("join_tier", plan.tier.id);
      url.searchParams.set(
        "join_cadence",
        effectiveCadence(plan.tier, cadence),
      );
    }
    return url.toString();
  };

  const finishJoin = (message: string) => {
    toaster({ type: "success", content: message });
    props.onClose?.();
    setBusyPlan(null);
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
    tier: PaidTier,
    v?: MembershipJoinViewer | null,
    cadenceOverride?: Cadence | null,
  ) => {
    const hasEmail = v?.hasEmail ?? viewer?.hasEmail ?? !!identity?.email;
    if (!hasEmail) {
      toaster({
        type: "error",
        content: "Add an email to your account before joining.",
      });
      return;
    }
    const joinCadence = cadenceOverride ?? effectiveCadence(tier, cadence);
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
        const tier = props.tiers.paid.find((t) => t.id === resume.tierId);
        if (resume.cadence === "year") setCadence("year");
        setProcessing(false);
        if (!v.loggedIn || !tier) return;
        await payWithViewer(tier, v, resume.cadence);
      }
    })();
  }, [props.active, props.resume]);

  // One-click free join for a signed-in reader who has the needed identity.
  const freeJoin = async () => {
    setBusyPlan("subscriber");
    if (props.newsletterMode && identity?.email) {
      const res = await requestPublicationEmailSubscription(
        props.publicationUri,
        identity.email,
        props.source,
      );
      if (!res.ok) {
        setBusyPlan(null);
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
        setBusyPlan(null);
        toaster({
          type: "error",
          content: "We couldn't subscribe you. Try again.",
        });
        return;
      }
    }
    finishJoin("You're subscribed!");
  };

  // Signed-out email joins mint a session with an auth code confirmed right
  // here — except on custom domains, where sessions are first-party on the
  // main site, so we bounce through its email login instead.
  const startEmailAuth = async (plan: MembershipPlan) => {
    const base = mainSiteAuthBase();
    if (base) {
      setBusyPlan(membershipPlanKey(plan));
      const url = new URL("/api/auth/email-login", base);
      url.searchParams.set("email", email);
      url.searchParams.set("redirect", joinReturnUrl(plan));
      url.searchParams.set("action", subscribeAction());
      window.location.href = url.toString();
      return;
    }
    setBusyPlan(membershipPlanKey(plan));
    try {
      const tokenId = await requestAuthEmailToken(email, {
        publicationName: props.publicationName,
        publicationUrl: props.publicationUrl,
      });
      setConfirmStep({ kind: "authToken", tokenId, plan });
    } catch {
      toaster({
        type: "error",
        content: "We couldn't send the email. Please try again!",
      });
    }
    setBusyPlan(null);
  };

  const redirectToOauthJoin = (plan: MembershipPlan, link: boolean) => {
    setBusyPlan(membershipPlanKey(plan));
    window.location.href = buildOauthLoginUrl({
      handle: handle.trim(),
      redirect: joinReturnUrl(plan),
      action: subscribeAction(),
      link,
      autoMerge: link,
    });
  };

  // The signed-in-but-linking email path: the publication confirmation code
  // attaches the typed email to the current identity on confirm.
  const sendPubCode = async (plan: MembershipPlan) => {
    setBusyPlan(membershipPlanKey(plan));
    const res = await requestPublicationEmailSubscription(
      props.publicationUri,
      email,
      props.source,
    );
    setBusyPlan(null);
    if (!res.ok) {
      toaster({ type: "error", content: SUBSCRIBE_ERROR_MESSAGES[res.error] });
      return;
    }
    if (res.value.confirmed) {
      if (plan.kind === "subscriber") finishJoin("You're subscribed!");
      else await payAfterIdentityChange(plan.tier);
      return;
    }
    setConfirmStep({ kind: "pubCode", plan });
  };

  // The session identity just changed (login or link) — refetch wallet and
  // membership before routing to payment.
  const payAfterIdentityChange = async (tier: PaidTier) => {
    mutate("identity");
    const v = await getMembershipJoinViewer(props.publicationUri);
    setViewer(v);
    await payWithViewer(tier, v);
  };

  const submitCode = async (code: string) => {
    if (!confirmStep || confirming) return;
    setConfirming(true);
    const plan = confirmStep.plan;
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
    if (plan.kind === "subscriber") {
      finishJoin("You're subscribed!");
      return;
    }
    await payAfterIdentityChange(plan.tier);
  };

  const selectPlan = async (plan: MembershipPlan) => {
    if (busyPlan || processing || identityPending) return;
    if (viewer?.isOwner) {
      toaster({
        type: "error",
        content: "This is your publication — you can't join it.",
      });
      return;
    }
    // Paid members' grid is ChangePlanForm once their membership row loads;
    // until then the plain grid renders and clicks wait.
    if (isPaidMember) return;

    if (identity) {
      if (hasNeededIdentity)
        return plan.kind === "subscriber"
          ? freeJoin()
          : payWithViewer(plan.tier);
      if (mode === "email" ? !validEmail(email) : !handle.trim())
        return setInputMissing(true);
      setLinkPlan(plan);
      return;
    }

    // Logged out: sign in/up with the typed identity first, then pay.
    if (mode === "email") {
      if (!validEmail(email)) return setInputMissing(true);
      return startEmailAuth(plan);
    }
    if (!handle.trim()) return setInputMissing(true);
    redirectToOauthJoin(plan, false);
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
      ) : manageStep && myMembership ? (
        <div className="flex justify-center">
          {manageStep === "cancel" ? (
            <CancelMembershipForm
              membership={myMembership}
              onSuccess={() => setManageStep(null)}
              onBack={() => setManageStep(null)}
            />
          ) : (
            <ResumeMembershipForm
              membership={myMembership}
              onSuccess={() => setManageStep(null)}
              onBack={() => setManageStep(null)}
            />
          )}
        </div>
      ) : (
        <div className="memberSignUp flex flex-col max-w-3xl">
          <div className="text-center flex flex-col gap-1 max-w-md mx-auto">
            <h2 className="text-primary leading-snug text-xl">
              {isPaidMember ? "Your membership to" : "Become a member of"}{" "}
              <br />
              {props.publicationName}
            </h2>
          </div>
          {isPaidMember ? (
            myMembership ? (
              <PaidMembershipStatus
                membership={myMembership}
                onCancel={() => setManageStep("cancel")}
                onResume={() => setManageStep("resume")}
              />
            ) : (
              <div className="flex justify-center pt-1 pb-4">
                <DotLoader />
              </div>
            )
          ) : viewer?.isOwner ? (
            <p className="text-tertiary text-lg text-center pt-1 pb-4">
              This is your publication — this is what readers see.
            </p>
          ) : identityPending ? (
            <div className="flex justify-center pt-1 pb-4">
              <DotLoader />
            </div>
          ) : subscribingAs ? (
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
          {isPaidMember && myMembership ? (
            <ChangePlanForm
              key={changeKey}
              membership={myMembership}
              tiers={props.tiers}
              gatePolicy={props.gatePolicy}
              onSuccess={() => {
                setChangeKey((k) => k + 1);
                props.onClose?.();
              }}
            />
          ) : (
            <TierGrid
              tiers={props.tiers}
              cadence={cadence}
              onCadenceChange={setCadence}
              busyPlan={busyPlan}
              currentMembership={viewerSub.membership}
              gatePolicy={props.gatePolicy}
              onSelectPlan={selectPlan}
            />
          )}
          {!identity && !identityPending ? (
            <p className="tierPaymentInfo text-tertiary text-sm text-center pt-4">
              Already Subscribed?{" "}
              <LoginModal trigger={<div className="underline">Sign in</div>} />
            </p>
          ) : null}
        </div>
      )}
      {linkPlan && identity && (
        <LinkIdentityModal
          open
          onOpenChange={(open) => {
            if (!open) setLinkPlan(null);
          }}
          signedInAs={
            identity.bsky_profiles?.handle
              ? `@${identity.bsky_profiles.handle}`
              : identity.email || "your account"
          }
          linkingIdentity={mode === "email" ? email : `@${handle.trim()}`}
          confirmButtonLabel={mode === "email" ? "Link email" : "Link Bluesky"}
          confirming={busyPlan !== null}
          onConfirm={async () => {
            const plan = linkPlan;
            setLinkPlan(null);
            if (mode === "email") await sendPubCode(plan);
            else redirectToOauthJoin(plan, true);
          }}
        />
      )}
    </>
  );
}

function PaidMembershipStatus(props: {
  membership: MyMembership;
  onCancel: () => void;
  onResume: () => void;
}) {
  const m = props.membership;
  const price = membershipPrice(m);
  const periodEnd = useLocalizedDate(m.currentPeriodEnd ?? "", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const active = isMembershipActive(m.status);
  const detail = !active
    ? "Not active"
    : m.cancelAtPeriodEnd
      ? m.currentPeriodEnd
        ? `Ends ${periodEnd}`
        : "Ends at the end of your billing period"
      : pendingPlanLabel(m, m.currentPeriodEnd ? periodEnd : "") ??
        (m.currentPeriodEnd ? `Renews ${periodEnd}` : "");
  return (
    <div className="membershipStatus flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 pb-4 text-center">
      <p className="text-tertiary text-lg">
        {m.tierName ?? "Membership"}
        {price ? ` · ${price}` : ""}
        {detail ? ` · ${detail}` : ""}
      </p>
      {active &&
        (m.cancelAtPeriodEnd ? (
          <ButtonPrimary
            compact
            type="button"
            className="text-sm"
            onClick={props.onResume}
          >
            Resume
          </ButtonPrimary>
        ) : (
          <ButtonSecondary
            compact
            type="button"
            className="text-sm"
            onClick={props.onCancel}
          >
            Cancel membership
          </ButtonSecondary>
        ))}
    </div>
  );
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
