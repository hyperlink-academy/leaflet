"use client";
import { useState } from "react";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Modal } from "components/Modal";
import { Input } from "components/Input";
import { useIdentityData } from "components/IdentityProvider";
import { useToaster } from "components/Toast";
import { usePublicationData } from "../PublicationSWRProvider";
import { SettingsSection } from "components/SettingsLayout";
import { ConnectPayments } from "components/StripeConnect/ConnectPayments";
import {
  enableMemberships,
  disableMemberships,
  upsertMembershipTier,
  deleteMembershipTier,
  type MembershipTierInput,
} from "actions/publications/membershipSettings";
import { formatPrice } from "components/Memberships/TierGrid";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number | null;
  currency: string;
  active: boolean;
  sort_order: number;
  is_free: boolean;
};

const AlphaBadge = () => (
  <span className="bg-accent-1 rounded-md px-1 text-accent-2 font-bold text-sm">
    alpha
  </span>
);

export const MonetizationSettings = () => {
  let { data } = usePublicationData();
  let { identity } = useIdentityData();

  let publicationUri = data?.publication?.uri;
  let enabled = data?.publication?.publication_membership_settings?.enabled;
  let chargesEnabled = !!identity?.connectedAccount?.charges_enabled;

  if (!publicationUri) return null;

  return (
    <>
      <SettingsSection title="Connect to Stripe">
        <ConnectPayments />
      </SettingsSection>
      {chargesEnabled &&
        (enabled ? (
          <MembershipTiers publicationUri={publicationUri} />
        ) : (
          <EnableMonetization publicationUri={publicationUri} />
        ))}
    </>
  );
};

const EnableMonetization = (props: { publicationUri: string }) => {
  let { mutate } = usePublicationData();
  let toaster = useToaster();
  let [enabling, setEnabling] = useState(false);

  return (
    <SettingsSection>
      <div className="leading-snug text-secondary">
        Enable Monetization to set up paid membership tiers.
      </div>
      <ButtonPrimary
        type="button"
        className="self-start"
        disabled={enabling}
        onClick={async () => {
          if (enabling) return;
          setEnabling(true);
          let res = await enableMemberships(props.publicationUri);
          setEnabling(false);
          if (!res.ok) {
            toaster({
              type: "error",
              content:
                res.error === "no_connected_account"
                  ? "Set up payments first to enable monetization."
                  : "Failed to enable monetization.",
            });
            return;
          }
          toaster({ type: "success", content: "Monetization enabled!" });
          await mutate();
        }}
      >
        {enabling ? <DotLoader /> : "Enable Monetization"}
      </ButtonPrimary>
    </SettingsSection>
  );
};

const MembershipTiers = (props: { publicationUri: string }) => {
  let { data, mutate } = usePublicationData();
  let toaster = useToaster();

  let tiers = (
    (data?.publication?.publication_membership_tiers ?? []) as Tier[]
  )
    .filter((t) => t.active)
    .toSorted(
      (a, b) =>
        Number(a.is_free) - Number(b.is_free) || a.sort_order - b.sort_order,
    );

  let [editingTier, setEditingTier] = useState<Tier | "new" | null>(null);
  let [disabling, setDisabling] = useState(false);

  return (
    <SettingsSection
      title={
        <>
          Membership Tiers
          <AlphaBadge />
        </>
      }
      className="pb-4"
    >
      <div className="flex flex-col gap-4">
        <div className="text-secondary leading-snug">
          Readers can join a tier below to unlock members-only content. Member
          payments are charged on your connected account, so subscriptions,
          customers, payouts, and disputes all appear in your own Stripe
          dashboard.
        </div>

        <div className="flex flex-col gap-2">
          {tiers.length === 0 && (
            <p className="text-tertiary text-sm leading-snug">
              No tiers yet. Add one so readers can become members.
            </p>
          )}
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="flex items-start justify-between gap-3 border border-border-light rounded-md px-3 py-2"
            >
              <div className="flex flex-col">
                <div className="font-bold text-primary">{tier.name}</div>
                {tier.description && (
                  <div className="text-tertiary text-sm leading-snug">
                    {tier.description}
                  </div>
                )}
                <div className="text-secondary text-sm">
                  {tier.is_free ? (
                    "Free"
                  ) : (
                    <>
                      {formatPrice(tier.monthly_price_cents)}/month
                      {tier.annual_price_cents != null &&
                        ` · ${formatPrice(tier.annual_price_cents)}/year`}
                    </>
                  )}
                </div>
              </div>
              <ButtonSecondary
                type="button"
                compact
                onClick={() => setEditingTier(tier)}
              >
                Edit
              </ButtonSecondary>
            </div>
          ))}
          <ButtonPrimary
            type="button"
            compact
            className="self-start"
            onClick={() => setEditingTier("new")}
          >
            Add Tier
          </ButtonPrimary>
        </div>

        <hr className="border-border-light" />

        <ButtonTertiary
          type="button"
          className="self-start"
          disabled={disabling}
          onClick={async () => {
            if (disabling) return;
            setDisabling(true);
            let res = await disableMemberships(props.publicationUri);
            setDisabling(false);
            if (!res.ok) {
              toaster({
                type: "error",
                content:
                  res.error === "unsupported"
                    ? "Monetization can't be turned off automatically yet — reach out and we'll help!"
                    : "Failed to disable monetization.",
              });
              return;
            }
            toaster({ type: "success", content: "Monetization disabled." });
            await mutate();
          }}
        >
          {disabling ? <DotLoader /> : "Disable Monetization"}
        </ButtonTertiary>
      </div>

      {editingTier !== null && (
        <TierEditorModal
          publicationUri={props.publicationUri}
          tier={editingTier === "new" ? null : editingTier}
          onClose={() => setEditingTier(null)}
          onSaved={async () => {
            setEditingTier(null);
            await mutate();
          }}
        />
      )}
    </SettingsSection>
  );
};

const TierEditorModal = (props: {
  publicationUri: string;
  tier: Tier | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) => {
  let toaster = useToaster();
  let isFree = !!props.tier?.is_free;
  let [name, setName] = useState(props.tier?.name ?? "");
  let [description, setDescription] = useState(props.tier?.description ?? "");
  let [monthly, setMonthly] = useState(
    props.tier ? (props.tier.monthly_price_cents / 100).toString() : "",
  );
  let [annual, setAnnual] = useState(
    props.tier?.annual_price_cents != null
      ? (props.tier.annual_price_cents / 100).toString()
      : "",
  );
  let [saving, setSaving] = useState(false);
  let [deleting, setDeleting] = useState(false);

  let parsePrice = (value: string): number | null => {
    if (!value.trim()) return null;
    let dollars = Number(value);
    if (isNaN(dollars)) return null;
    return Math.round(dollars * 100);
  };

  let onSave = async () => {
    if (saving) return;
    if (!name.trim()) {
      toaster({ type: "error", content: "Tiers need a name." });
      return;
    }
    // The free tier keeps its price; only name/description are editable.
    let monthlyCents = isFree ? 0 : parsePrice(monthly);
    let annualCents = isFree ? null : parsePrice(annual);
    if (!isFree) {
      if (monthlyCents === null || monthlyCents < 100) {
        toaster({
          type: "error",
          content: "Tiers need a monthly price of at least $1.",
        });
        return;
      }
      if (annual.trim() && (annualCents === null || annualCents < 100)) {
        toaster({
          type: "error",
          content: "Annual price must be at least $1, or left blank.",
        });
        return;
      }
    }
    let input: MembershipTierInput = {
      id: props.tier?.id,
      name: name.trim(),
      description: description.trim() || null,
      monthly_price_cents: monthlyCents ?? 0,
      annual_price_cents: annualCents,
      sort_order: props.tier?.sort_order,
    };
    setSaving(true);
    let res = await upsertMembershipTier(props.publicationUri, input);
    setSaving(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content:
          res.error === "stripe_error"
            ? "We couldn't sync the tier with Stripe. Please try again!"
            : "We couldn't save the tier. Please try again!",
      });
      return;
    }
    toaster({ type: "success", content: "Tier saved!" });
    await props.onSaved();
  };

  let onDelete = async () => {
    if (!props.tier || deleting) return;
    setDeleting(true);
    let res = await deleteMembershipTier(props.publicationUri, props.tier.id);
    setDeleting(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content: "We couldn't remove the tier. Please try again!",
      });
      return;
    }
    toaster({ type: "success", content: "Tier removed." });
    await props.onSaved();
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title={props.tier ? "Edit Tier" : "Add Tier"}
      className="max-w-full w-sm"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-secondary font-bold" htmlFor="tierName">
            Name
          </label>
          <Input
            id="tierName"
            className="input-with-border w-full text-primary"
            type="text"
            value={name}
            placeholder="Supporter"
            onChange={(e) => setName(e.currentTarget.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-secondary font-bold" htmlFor="tierDescription">
            Description{" "}
            <span className="font-normal text-tertiary">(optional)</span>
          </label>
          <Input
            id="tierDescription"
            className="input-with-border w-full text-primary"
            type="text"
            value={description}
            placeholder="Access to members-only posts"
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
        </div>
        {isFree ? (
          <div className="text-tertiary text-sm leading-snug">
            The free tier lets readers subscribe without paying. It&apos;s
            always free and can&apos;t be removed — you can only rename it.
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 grow">
              <label className="text-secondary font-bold" htmlFor="tierMonthly">
                Monthly ($)
              </label>
              <Input
                id="tierMonthly"
                className="input-with-border w-full text-primary"
                type="number"
                min="1"
                step="0.01"
                value={monthly}
                placeholder="5"
                onChange={(e) => setMonthly(e.currentTarget.value)}
              />
            </div>
            <div className="flex flex-col gap-1 grow">
              <label className="text-secondary font-bold" htmlFor="tierAnnual">
                Annual ($){" "}
                <span className="font-normal text-tertiary">(optional)</span>
              </label>
              <Input
                id="tierAnnual"
                className="input-with-border w-full text-primary"
                type="number"
                min="1"
                step="0.01"
                value={annual}
                placeholder="50"
                onChange={(e) => setAnnual(e.currentTarget.value)}
              />
            </div>
          </div>
        )}
        <div className="flex justify-between items-center pt-1">
          {props.tier && !isFree ? (
            <ButtonSecondary
              type="button"
              disabled={deleting}
              onClick={onDelete}
            >
              {deleting ? <DotLoader /> : "Remove"}
            </ButtonSecondary>
          ) : (
            <div />
          )}
          <ButtonPrimary type="button" disabled={saving} onClick={onSave}>
            {saving ? <DotLoader /> : "Save Tier"}
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
  );
};
