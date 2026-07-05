"use client";
import { useState } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Modal } from "components/Modal";
import { Input } from "components/Input";
import { useIdentityData } from "components/IdentityProvider";
import { useToaster } from "components/Toast";
import { usePublicationData } from "../PublicationSWRProvider";
import { DashboardContainer } from "./SettingsContent";
import {
  enableMemberships,
  disableMemberships,
  upsertMembershipTier,
  deleteMembershipTier,
  type MembershipTierInput,
} from "actions/publications/membershipSettings";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number | null;
  currency: string;
  active: boolean;
  sort_order: number;
};

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

export const MembershipSettings = () => {
  let { data, mutate } = usePublicationData();
  let { identity } = useIdentityData();
  let toaster = useToaster();

  let publicationUri = data?.publication?.uri;
  let enabled = data?.publication?.publication_membership_settings?.enabled;
  let tiers = ((data?.publication?.publication_membership_tiers ??
    []) as Tier[])
    .filter((t) => t.active)
    .toSorted((a, b) => a.sort_order - b.sort_order);
  let chargesEnabled = !!identity?.connectedAccount?.charges_enabled;

  let [enabling, setEnabling] = useState(false);
  let [disabling, setDisabling] = useState(false);
  let [editingTier, setEditingTier] = useState<Tier | "new" | null>(null);

  if (!publicationUri) return null;

  if (!enabled) {
    return (
      <DashboardContainer
        section={
          <>
            Paid Memberships
            <span className="bg-accent-1 rounded-md px-1 text-accent-2 font-bold text-sm">
              alpha
            </span>
          </>
        }
        className="pb-4"
      >
        <div className="leading-snug text-secondary">
          Offer paid membership tiers and share members-only content with
          readers who support you.
        </div>
        {!chargesEnabled && (
          <div className="leading-snug text-tertiary text-sm">
            Set up payments above to enable paid memberships.
          </div>
        )}
        <ButtonPrimary
          type="button"
          className="self-start"
          disabled={enabling || !chargesEnabled}
          onClick={async () => {
            if (!publicationUri || enabling || !chargesEnabled) return;
            setEnabling(true);
            let res = await enableMemberships(publicationUri);
            setEnabling(false);
            if (!res.ok) {
              toaster({
                type: "error",
                content:
                  res.error === "no_connected_account"
                    ? "Set up payments first to enable memberships."
                    : "Failed to enable memberships.",
              });
              return;
            }
            toaster({ type: "success", content: "Memberships enabled!" });
            await mutate();
          }}
        >
          {enabling ? <DotLoader /> : "Enable Paid Memberships"}
        </ButtonPrimary>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer
      section={
        <>
          Paid Memberships
          <span className="bg-accent-1 rounded-md px-1 text-accent-2 font-bold text-sm">
            alpha
          </span>
        </>
      }
      className="pb-4"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-secondary leading-snug">
            Memberships are enabled. Readers can join a tier below to unlock
            members-only content.
          </div>
          <ButtonSecondary
            type="button"
            disabled={disabling}
            onClick={async () => {
              if (!publicationUri || disabling) return;
              setDisabling(true);
              let res = await disableMemberships(publicationUri);
              setDisabling(false);
              if (!res.ok) {
                toaster({
                  type: "error",
                  content: "Failed to disable memberships.",
                });
                return;
              }
              toaster({ type: "success", content: "Memberships disabled." });
              await mutate();
            }}
          >
            {disabling ? <DotLoader /> : "Disable"}
          </ButtonSecondary>
        </div>

        <hr className="border-border-light" />

        <div className="flex flex-col gap-2">
          <p className="text-secondary font-bold">Tiers</p>
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
                  {formatPrice(tier.monthly_price_cents)}/month
                  {tier.annual_price_cents != null &&
                    ` · ${formatPrice(tier.annual_price_cents)}/year`}
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
      </div>

      {editingTier !== null && (
        <TierEditorModal
          publicationUri={publicationUri}
          tier={editingTier === "new" ? null : editingTier}
          onClose={() => setEditingTier(null)}
          onSaved={async () => {
            setEditingTier(null);
            await mutate();
          }}
        />
      )}
    </DashboardContainer>
  );
};

const TierEditorModal = (props: {
  publicationUri: string;
  tier: Tier | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) => {
  let toaster = useToaster();
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
    let monthlyCents = parsePrice(monthly);
    if (!name.trim() || monthlyCents === null || monthlyCents < 100) {
      toaster({
        type: "error",
        content: "Tiers need a name and a monthly price of at least $1.",
      });
      return;
    }
    let annualCents = parsePrice(annual);
    if (annual.trim() && (annualCents === null || annualCents < 100)) {
      toaster({
        type: "error",
        content: "Annual price must be at least $1, or left blank.",
      });
      return;
    }
    let input: MembershipTierInput = {
      id: props.tier?.id,
      name: name.trim(),
      description: description.trim() || null,
      monthly_price_cents: monthlyCents,
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
          <label
            className="text-secondary font-bold"
            htmlFor="tierDescription"
          >
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
        <div className="flex justify-between items-center pt-1">
          {props.tier ? (
            <ButtonSecondary type="button" disabled={deleting} onClick={onDelete}>
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
