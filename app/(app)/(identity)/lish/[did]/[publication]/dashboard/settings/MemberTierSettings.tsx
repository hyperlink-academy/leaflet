import {
  disableMemberships,
  MembershipTierInput,
  upsertMembershipTier,
  deleteMembershipTier,
  updateSubscriberTier,
} from "actions/publications/membershipSettings";
import {
  ButtonSecondary,
  ButtonPrimary,
  ButtonTertiary,
} from "components/Buttons";
import { formatPrice } from "components/Memberships/TierGrid";
import { SettingsSection } from "components/SettingsLayout";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import { useState } from "react";
import { Modal } from "components/Modal";
import { Input, InputWithLabel } from "components/Input";
import { TierDescription } from "components/Memberships/TierDescription";
import { TierDescriptionEditor } from "components/Memberships/TierDescriptionEditor";
import { usePublicationData } from "../PublicationSWRProvider";
import { AddTiny } from "components/Icons/AddTiny";
import { EditTiny } from "components/Icons/EditTiny";
import { buildMembershipTiers } from "src/membership";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number | null;
  currency: string;
  active: boolean;
  sort_order: number;
  publication_memberships: { count: number }[];
};

const memberCount = (tier: Tier) =>
  tier.publication_memberships?.[0]?.count ?? 0;

export const MembershipTiers = (props: { publicationUri: string }) => {
  let { data, mutate } = usePublicationData();
  let toaster = useToaster();

  let membershipSettings = data?.publication?.publication_membership_settings;
  let subscriberTier = buildMembershipTiers(membershipSettings, []).subscriber;

  let tiers = (
    (data?.publication?.publication_membership_tiers ?? []) as Tier[]
  )
    .filter((t) => t.active)
    .toSorted(
      (a, b) =>
        a.monthly_price_cents - b.monthly_price_cents ||
        a.sort_order - b.sort_order,
    );

  let [editingTier, setEditingTier] = useState<Tier | "new" | null>(null);
  let [editingSubscriberTier, setEditingSubscriberTier] = useState(false);
  let [disabling, setDisabling] = useState(false);

  return (
    <SettingsSection title="Membership Tiers">
      <p className="font-bold">
        Paid Membership is in Alpha. Some issues may occur.
      </p>
      <div className="text-secondary leading-snug flex flex-col gap-1">
        <p>
          Readers can join a tier to unlock paywalled content in your posts.
        </p>
        <p>
          Add paywalls by typing "/" in the post editor and selecting "Paywall"
          from the block menu.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col opaque-container py-2 px-3">
          <div className="flex justify-between">
            <h3 className="font-bold text-primary">{subscriberTier.name}</h3>
            <button
              type="button"
              className="py-1.5 h-fit shrink-0"
              onClick={() => setEditingSubscriberTier(true)}
            >
              <EditTiny />
            </button>
          </div>

          {subscriberTier.description && (
            <div className="text-tertiary text-sm leading-snug">
              <TierDescription description={subscriberTier.description} />
            </div>
          )}
        </div>

        {tiers.length === 0 && (
          <p className="text-tertiary text-sm leading-snug">
            No paid tiers yet. Add one so readers can support your publication.
          </p>
        )}
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="flex flex-col opaque-container py-2 px-3"
          >
            <div className="flex justify-between">
              <div className="flex sm:flex-row flex-col sm:gap-3 gap-1 sm:items-center  grow">
                <h3 className="font-bold text-primary">{tier.name}</h3>
                <div className="prices flex gap-2 font-bold sm:pb-0 pb-2">
                  <div className="accent-container px-2 text-secondary ">
                    {formatPrice(tier.monthly_price_cents)}/mo
                  </div>
                  {tier.annual_price_cents && (
                    <div className="accent-container px-1.5">
                      {formatPrice(tier.annual_price_cents)}/yr
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="py-1.5 h-fit shrink-0"
                onClick={() => setEditingTier(tier)}
              >
                <EditTiny />
              </button>
            </div>

            {tier.description && (
              <div className="text-tertiary text-sm leading-snug">
                <TierDescription description={tier.description} />
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          className="w-full h-16 accent-container border border-border-light hover:border-accent-contrast! outline-2 outline-transparent hover:outline-accent-contrast outline-offset-1 font-bold text-accent-contrast flex gap-2 items-center justify-center "
          onClick={() => setEditingTier("new")}
        >
          <AddTiny /> Add New Tier
        </button>
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
        {disabling ? <DotLoader /> : "Disable Membership Tiers"}
      </ButtonTertiary>

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

      {editingSubscriberTier && (
        <SubscriberTierEditorModal
          publicationUri={props.publicationUri}
          name={subscriberTier.name}
          description={subscriberTier.description}
          onClose={() => setEditingSubscriberTier(false)}
          onSaved={async () => {
            setEditingSubscriberTier(false);
            await mutate();
          }}
        />
      )}
    </SettingsSection>
  );
};

const SubscriberTierEditorModal = (props: {
  publicationUri: string;
  name: string;
  description: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) => {
  let toaster = useToaster();
  let [name, setName] = useState(props.name);
  let [description, setDescription] = useState<string | null>(
    props.description,
  );
  let [saving, setSaving] = useState(false);

  let onSave = async () => {
    if (saving || !name.trim()) return;
    setSaving(true);
    let res = await updateSubscriberTier(props.publicationUri, {
      name,
      description,
    });
    setSaving(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content: "We couldn't save the tier. Please try again!",
      });
      return;
    }
    toaster({ type: "success", content: "Tier saved!" });
    await props.onSaved();
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title="Edit Subscriber Tier"
      className="max-w-full w-md"
    >
      <div className="flex flex-col gap-3">
        <InputWithLabel
          id="subscriberTierName"
          label="Tier Name"
          type="text"
          value={name}
          placeholder="Free"
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <TierDescriptionEditor
          label="Description"
          initialValue={description}
          placeholder="Subscribe for free to get notified about new posts."
          onChange={setDescription}
        />
        <div className="flex justify-end pt-1">
          <ButtonPrimary
            type="button"
            disabled={saving || !name.trim()}
            onClick={onSave}
          >
            {saving ? <DotLoader /> : "Save Tier"}
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
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
  let [description, setDescription] = useState<string | null>(
    props.tier?.description ?? null,
  );
  let [monthly, setMonthly] = useState(
    props.tier ? (props.tier.monthly_price_cents / 100).toString() : "",
  );
  let [annual, setAnnual] = useState(
    props.tier?.annual_price_cents != null
      ? (props.tier.annual_price_cents / 100).toString()
      : "",
  );
  // Until the owner sets an annual price themselves, it tracks the monthly one
  // at ten months' worth — the usual "two months free" annual discount. A tier
  // that already has one counts as set, so editing its monthly price doesn't
  // overwrite a number the owner chose in an earlier session.
  let [annualEdited, setAnnualEdited] = useState(
    props.tier?.annual_price_cents != null,
  );
  let [saving, setSaving] = useState(false);
  let [deleting, setDeleting] = useState(false);
  let members = props.tier ? memberCount(props.tier) : 0;
  let priceLocked = members > 0;

  let parsePrice = (value: string): number | null => {
    if (!value.trim()) return null;
    let dollars = Number(value);
    if (isNaN(dollars)) return null;
    return Math.round(dollars * 100);
  };

  let onMonthlyChange = (value: string) => {
    setMonthly(value);
    if (annualEdited && annual.trim()) return;
    let dollars = Number(value);
    setAnnual(
      value.trim() && !isNaN(dollars) && dollars > 0
        ? (Math.round(dollars * 1000) / 100).toString()
        : "",
    );
  };

  let missingRequired = !name.trim() || !monthly.trim() || !annual.trim();

  let onSave = async () => {
    if (saving) return;
    if (!name.trim()) {
      toaster({ type: "error", content: "Tiers need a name." });
      return;
    }
    let monthlyCents = parsePrice(monthly);
    let annualCents = parsePrice(annual);
    if (monthlyCents === null || monthlyCents < 100) {
      toaster({
        type: "error",
        content: "Tiers need a monthly price of at least $1.",
      });
      return;
    }
    if (annualCents === null || annualCents < 100) {
      toaster({
        type: "error",
        content: "Tiers need an annual price of at least $1.",
      });
      return;
    }
    let input: MembershipTierInput = {
      id: props.tier?.id,
      name: name.trim(),
      description,
      monthly_price_cents: priceLocked
        ? props.tier!.monthly_price_cents
        : monthlyCents,
      annual_price_cents: priceLocked
        ? props.tier!.annual_price_cents
        : annualCents,
      sort_order: props.tier?.sort_order,
    };
    setSaving(true);
    let res = await upsertMembershipTier(props.publicationUri, input);
    setSaving(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content:
          res.error === "tier_has_members"
            ? "This tier has members, so its price can't be changed."
            : res.error === "stripe_error"
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
      className="max-w-full w-md"
    >
      <div className="flex flex-col gap-3">
        <InputWithLabel
          id="tierName"
          label="Tier Name"
          type="text"
          value={name}
          placeholder="Supporter"
          onChange={(e) => setName(e.currentTarget.value)}
        />

        <TierDescriptionEditor
          label="Description"
          initialValue={description}
          placeholder="Access to members-only posts"
          onChange={setDescription}
        />
        <div className="flex gap-4">
          <div className="flex flex-col gap-1 grow min-w-0">
            <label className="text-secondary font-bold" htmlFor="tierMonthly">
              Monthly
            </label>
            <div className="input-with-border w-full text-primary flex gap-1 min-w-0">
              <div className="w-fit text-tertiary">$</div>
              <Input
                size={1}
                id="tierMonthly"
                type="number"
                className="w-full appearance-none!"
                min="1"
                step="0.01"
                value={monthly}
                disabled={priceLocked}
                onChange={(e) => onMonthlyChange(e.currentTarget.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 grow">
            <label className="text-secondary font-bold" htmlFor="tierAnnual">
              Annual
            </label>
            <div className="input-with-border w-full text-primary flex gap-1">
              <div className="w-fit text-tertiary">$</div>
              <Input
                size={1}
                id="tierAnnual"
                type="number"
                className="w-full appearance-none!"
                min="1"
                step="0.01"
                value={annual}
                disabled={priceLocked}
                onChange={(e) => {
                  setAnnualEdited(true);
                  setAnnual(e.currentTarget.value);
                }}
              />
            </div>
          </div>
        </div>
        {priceLocked && (
          <p className="text-tertiary text-sm leading-snug">
            {members === 1 ? "1 member is" : `${members} members are`} on this
            tier, so its price can't be changed. To offer a different price,
            add a new tier.
          </p>
        )}
        <div className="flex justify-between items-center pt-1">
          {props.tier ? (
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
          <ButtonPrimary
            type="button"
            disabled={saving || missingRequired}
            onClick={onSave}
          >
            {saving ? <DotLoader /> : "Save Tier"}
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
  );
};
