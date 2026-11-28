"use client";
import { useState } from "react";
import { AtUri } from "@atproto/syntax";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { saveCtaDefaults } from "actions/publications/saveCtaDefaults";
import { setPublicationCtaCache } from "components/Subscribe/usePublicationCta";
import {
  savedCtaDefaults,
  type CtaSection,
  type CtaText,
} from "src/publicationDefaults";
import { AutosizeTextarea } from "components/utils/AutosizeTextarea";
import { SettingsSection, InputSetting } from "components/SettingsLayout";
import { IdentityContext } from "components/IdentityProvider";
import { SubscribePanel } from "components/Subscribe/SubscribeButton";
import { useMembershipTiers } from "components/Memberships/useMembershipTiers";
import {
  MembersOnlyPaywallCard,
  membersOnlyPaywallCopy,
} from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/MembersOnlyPaywall";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import type {
  GatePolicy,
  MembershipTiers,
  ResolvedPublicationMembership,
  WiderRelease,
} from "src/membership";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../PublicationSWRProvider";

type PubInfo = {
  uri: string;
  cta: ReturnType<typeof savedCtaDefaults>;
  url: string | undefined;
  name: string;
  description: string | undefined;
  iconSrc: string | undefined;
  newsletterMode: boolean;
  paidTiers: MembershipTiers["paid"];
};

const DAY = 24 * 60 * 60 * 1000;

export function CtaSettings() {
  let { data } = usePublicationData();
  let record = useNormalizedPublicationRecord();
  let pub = data?.publication;
  let { tiers, hasPaidTiers } = useMembershipTiers(pub?.uri);
  if (!pub) return null;

  let pubInfo: PubInfo = {
    uri: pub.uri,
    cta: savedCtaDefaults(pub.defaults),
    url: record?.url,
    name: record?.name ?? pub.name,
    description: record?.description,
    iconSrc: record?.icon
      ? blobRefToSrc(record.icon.ref, new AtUri(pub.uri).host)
      : undefined,
    newsletterMode: !!pub.publication_newsletter_settings?.enabled,
    paidTiers: hasPaidTiers ? tiers?.paid ?? [] : [],
  };

  return (
    <>
      <GeneralCta pub={pubInfo} />
      <PaywallCta kind="locked" pub={pubInfo} />
      <PaywallCta kind="earlyAccess" pub={pubInfo} />
    </>
  );
}

const PAYWALL_SECTIONS = {
  general: {
    title: "General",
    help: (
      <>
        This appears wherever it is possible to subscribe to your publication.
        You can find it at the bottom of each post or the Subscribe Form block.
      </>
    ),
  },
  locked: {
    title: "Locked",
    help: (
      <div>
        If you gate your content for certain subscribers or members, readers
        without access will see this.
      </div>
    ),
  },
  earlyAccess: {
    title: "Early Access",
    help: (
      <div>
        If you offer early access to your content for certain subscribers or
        members, readers who do not yet have access will see this CTA.
      </div>
    ),
  },
} as const;

function GeneralCta(props: { pub: PubInfo }) {
  let saved = props.pub.cta.general;
  let [header, setHeader] = useState(saved?.header ?? "");
  let [description, setDescription] = useState(saved?.description ?? "");
  let text = { header, description };

  return (
    <SettingsSection
      title={PAYWALL_SECTIONS.general.title}
      help={PAYWALL_SECTIONS.general.help}
    >
      <CtaInputs
        id="cta-general"
        header={header}
        setHeader={setHeader}
        headerPlaceholder={props.pub.name}
        description={description}
        setDescription={setDescription}
        descriptionPlaceholder={props.pub.description}
      />
      <CtaPreview>
        <SubscribePanel
          publicationUri={props.pub.uri}
          publicationUrl={props.pub.url}
          publicationName={props.pub.name}
          publicationDescription={props.pub.description}
          cta={{ header: header.trim(), description: description.trim() }}
          newsletterMode={props.pub.newsletterMode}
        />
      </CtaPreview>
      <SaveButton
        publicationUri={props.pub.uri}
        section="general"
        saved={saved}
        text={text}
      />
    </SettingsSection>
  );
}

function PaywallCta(props: { kind: "locked" | "earlyAccess"; pub: PubInfo }) {
  let section = PAYWALL_SECTIONS[props.kind];
  let hasPaidTiers = props.pub.paidTiers.length > 0;
  let saved = props.pub.cta[props.kind];
  let [header, setHeader] = useState(saved?.header ?? "");
  let [upgradeHeader, setUpgradeHeader] = useState(saved?.upgradeHeader ?? "");
  let [description, setDescription] = useState(saved?.description ?? "");
  let text = { header, upgradeHeader, description };

  let signUp = samplePaywallCopy(props.kind, props.pub, null);
  let upgrade = hasPaidTiers
    ? samplePaywallCopy(props.kind, props.pub, { kind: "free" })
    : null;

  return (
    <SettingsSection title={section.title} help={section.help}>
      <CtaInputs
        id={`cta-${props.kind}`}
        header={header}
        setHeader={setHeader}
        headerLabel={hasPaidTiers ? "Sign Up Header" : "Header"}
        headerPlaceholder={signUp.heading}
        upgradeHeader={hasPaidTiers ? upgradeHeader : undefined}
        setUpgradeHeader={setUpgradeHeader}
        upgradeHeaderPlaceholder={upgrade?.heading}
        description={description}
        setDescription={setDescription}
      />
      <div
        className={`grid gap-3 md:gap-y-1 ${upgrade ? "md:grid-cols-2" : ""}`}
      >
        <CtaPreview
          label={upgrade ? "Sign up" : undefined}
          help={
            upgrade ? "Shown to readers who aren't subscribed yet." : undefined
          }
        >
          <MembersOnlyPaywallCard
            className="m-0!"
            iconSrc={props.pub.iconSrc}
            pubName={props.pub.name}
            copy={{ ...signUp, heading: header.trim() || signUp.heading }}
            description={description.trim() || undefined}
          >
            <ButtonPrimary type="button" className="text-sm!">
              Subscribe
            </ButtonPrimary>
          </MembersOnlyPaywallCard>
        </CtaPreview>
        {upgrade && (
          <CtaPreview
            label="Upgrade"
            help="Shown to subscribers who need to upgrade to read."
          >
            <MembersOnlyPaywallCard
              className="m-0!"
              iconSrc={props.pub.iconSrc}
              pubName={props.pub.name}
              copy={{
                ...upgrade,
                heading: upgradeHeader.trim() || upgrade.heading,
              }}
              description={description.trim() || undefined}
            >
              <div className="flex flex-col gap-1 items-center justify-center">
                <ButtonPrimary type="button" className="text-sm!">
                  Upgrade
                </ButtonPrimary>
                <div className="text-accent-contrast text-sm">
                  Manage Subscription
                </div>
              </div>
            </MembersOnlyPaywallCard>
          </CtaPreview>
        )}
      </div>
      <SaveButton
        publicationUri={props.pub.uri}
        section={props.kind}
        saved={saved}
        text={text}
      />
    </SettingsSection>
  );
}

function samplePaywallCopy(
  kind: "locked" | "earlyAccess",
  pub: PubInfo,
  membership: ResolvedPublicationMembership | null,
) {
  let hasPaidTiers = pub.paidTiers.length > 0;
  let gatePolicy: GatePolicy = hasPaidTiers
    ? { audience: "paid" }
    : { audience: "subscribers" };
  let now = Date.now();
  let widerRelease: WiderRelease | null =
    kind === "earlyAccess"
      ? {
          at: new Date(now + 7 * DAY - 60_000).toISOString(),
          audience:
            hasPaidTiers && membership
              ? { audience: "subscribers" }
              : { audience: "public" },
        }
      : null;
  return membersOnlyPaywallCopy({
    membership,
    gatePolicy,
    tiers: pub.paidTiers,
    widerRelease,
    now,
  });
}

const autosizeInputClass =
  "input-with-border w-full text-primary focus-within:border-tertiary focus-within:outline-solid focus-within:outline-tertiary focus-within:outline-2 focus-within:outline-offset-1";

const preventNewline = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter") e.preventDefault();
};

function CtaInputs(props: {
  id: string;
  header: string;
  setHeader: (v: string) => void;
  headerLabel?: string;
  headerPlaceholder?: string;
  upgradeHeader?: string;
  setUpgradeHeader?: (v: string) => void;
  upgradeHeaderPlaceholder?: string;
  description: string;
  setDescription: (v: string) => void;
  descriptionPlaceholder?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <InputSetting
        label={props.headerLabel ?? "Header"}
        optional
        htmlFor={`${props.id}-header`}
      >
        <AutosizeTextarea
          className={autosizeInputClass}
          id={`${props.id}-header`}
          value={props.header}
          placeholder={props.headerPlaceholder}
          onKeyDown={preventNewline}
          onChange={(e) => props.setHeader(e.currentTarget.value)}
        />
      </InputSetting>
      {props.upgradeHeader !== undefined && props.setUpgradeHeader && (
        <InputSetting
          label="Upgrade Header"
          optional
          htmlFor={`${props.id}-upgrade-header`}
        >
          <AutosizeTextarea
            className={autosizeInputClass}
            id={`${props.id}-upgrade-header`}
            value={props.upgradeHeader}
            placeholder={props.upgradeHeaderPlaceholder}
            onKeyDown={preventNewline}
            onChange={(e) => props.setUpgradeHeader!(e.currentTarget.value)}
          />
        </InputSetting>
      )}
      <InputSetting
        label="Description"
        optional
        htmlFor={`${props.id}-description`}
      >
        <AutosizeTextarea
          className={autosizeInputClass}
          id={`${props.id}-description`}
          value={props.description}
          placeholder={props.descriptionPlaceholder}
          onChange={(e) => props.setDescription(e.currentTarget.value)}
        />
      </InputSetting>
    </div>
  );
}

function CtaPreview(props: {
  label?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 min-w-0 md:grid md:grid-rows-subgrid md:row-span-2">
      <IdentityContext.Provider
        value={{
          identity: null,
          mutate: (async () => null) as any,
          identityPending: false,
        }}
      >
        <div
          inert
          className="grow rounded-lg bg-bg-page p-3 sm:p-4 pointer-events-none select-none flex flex-col gap-2"
        >
          <div>
            <p className="text-sm font-bold text-tertiary">{props.label}</p>
            {props.help && (
              <p className="text-sm text-tertiary">{props.help}</p>
            )}
          </div>
          {props.children}
        </div>
      </IdentityContext.Provider>
    </div>
  );
}

function SaveButton(props: {
  publicationUri: string;
  section: CtaSection;
  saved: CtaText | undefined;
  text: CtaText;
}) {
  let { mutate } = usePublicationData();
  let toaster = useToaster();
  let [saving, setSaving] = useState(false);
  let keys = ["header", "upgradeHeader", "description"] as const;
  let dirty = keys.some(
    (k) => (props.text[k]?.trim() ?? "") !== (props.saved?.[k] ?? ""),
  );

  return (
    <div className="flex justify-end">
      <ButtonPrimary
        type="button"
        disabled={!dirty || saving}
        onClick={async () => {
          setSaving(true);
          let res;
          try {
            res = await saveCtaDefaults(
              props.publicationUri,
              props.section,
              props.text,
            );
          } catch {
            toaster({ type: "error", content: "Couldn't save. Try again." });
            return;
          } finally {
            setSaving(false);
          }
          if (!res.ok) {
            toaster({
              type: "error",
              content:
                res.error === "unauthorized"
                  ? "You don't have permission to edit this publication."
                  : res.error === "header_too_long"
                    ? "Not saved! A header was too long."
                    : res.error === "description_too_long"
                      ? "Not saved! A description was too long."
                      : "Couldn't save. Try again.",
            });
            return;
          }
          await Promise.all([
            mutate(),
            setPublicationCtaCache(props.publicationUri, res.value),
          ]);
          toaster({ type: "success", content: "Saved!" });
        }}
      >
        {saving ? <DotLoader /> : "Save"}
      </ButtonPrimary>
    </div>
  );
}
