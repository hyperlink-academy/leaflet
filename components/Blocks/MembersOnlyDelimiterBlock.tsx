import { useIsBlockSelected } from "src/useUIState";
import { LockTiny } from "components/Icons/LockTiny";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { BlockProps } from "./Block";
import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { Popover } from "components/Popover";
import { AudienceChecklist } from "components/Memberships/AudienceChecklist";
import {
  WIDER_RELEASE_DELAYS,
  getDocumentWiderRelease,
  isWiderReleaseDelay,
  widerReleaseAudience,
  type AudiencePolicy,
  type GatePolicy,
  type WiderReleaseDelay,
} from "src/membership";
import { ToggleGroup } from "components/ToggleGroup";
import { useSetGatePolicy } from "components/Memberships/useSetGatePolicy";

export const MembersOnlyDelimiterBlock = (props: BlockProps) => {
  let isSelected = useIsBlockSelected(props.entityID);
  let { permissions } = useEntitySetContext();
  let { data: pub } = useLeafletPublicationData();

  let audienceFact = useEntity(props.entityID, "block/members-only-audience");
  let tierFacts = useEntity(props.entityID, "block/members-only-tier");
  let earlyAccess = isWiderReleaseDelay(
    useEntity(props.entityID, "block/members-only-wider-release-timeline")?.data
      .value,
  );

  let membershipsEnabled =
    !!pub?.publications?.publication_membership_settings?.enabled;
  let tiers = membershipsEnabled
    ? (pub?.publications?.publication_membership_tiers ?? [])
        .filter((t) => t.active)
        .sort((a, b) => a.monthly_price_cents - b.monthly_price_cents)
    : [];

  let checkedIds = [
    ...new Set(
      tierFacts
        .map((f) => f.data.value)
        .filter((id) => tiers.some((t) => t.id === id)),
    ),
  ];
  let audience = audienceFact?.data.value;
  let policy: GatePolicy =
    audience === "subscribers"
      ? { audience }
      : audience === "paid"
        ? { audience }
        : audience === "tiers"
          ? { audience, tierIds: checkedIds }
          : { audience: "tiers", tierIds: [] };

  return (
    <div
      className={`my-2 w-full flex items-center gap-2 text-tertiary text-sm
    ${isSelected ? "block-border-selected border-none!" : ""}
  `}
    >
      <hr className="grow min-w-4" />
      <div className="flex items-center gap-2 min-w-0 font-bold">
        <LockTiny className="shrink-0" />
        <span className="w-max shrink-0">
          {earlyAccess ? "Early access for" : "Unlocked for"}
        </span>
        {permissions.write ? (
          <TierSelector
            entityID={props.entityID}
            tiers={tiers}
            policy={policy}
          />
        ) : (
          gateSummary(policy, tiers)
        )}
      </div>
      <hr className="grow min-w-4" />
    </div>
  );
};

type Tier = {
  id: string;
  name: string;
  monthly_price_cents: number;
};

// With a single tier, "paid members" and "members of that tier" are the same
// readers, so name the tier instead.
function paidLabel(tiers: Tier[]) {
  return tiers.length === 1 ? tiers[0].name : "All Paid Members";
}

function gateSummary(policy: GatePolicy, tiers: Tier[]) {
  if (policy.audience === "subscribers") return "All Subscribers";
  if (policy.audience === "paid") return paidLabel(tiers);
  const names = tiers
    .filter((tier) => policy.tierIds.includes(tier.id))
    .map((tier) => tier.name);
  return names.length > 0 ? (
    <span>
      <span className="sm:block hidden">{names.join(", ")}</span>
      <span className="block sm:hidden">Selected Tiers ({names.length})</span>
    </span>
  ) : (
    "Selected Tiers"
  );
}

function TierSelector(props: {
  entityID: string;
  tiers: Tier[];
  policy: GatePolicy;
}) {
  let { rep } = useReplicache();
  let { setAudience } = useSetGatePolicy(
    props.entityID,
    "block/members-only-audience",
    "block/members-only-tier",
  );
  // Once the published post's wider release has passed, its gate can't be
  // changed back; publish keeps the release as it was.
  let { normalizedDocument } = useLeafletPublicationData();
  let publishedRelease = getDocumentWiderRelease(normalizedDocument);
  let pastRelease =
    publishedRelease && new Date(publishedRelease.at).getTime() <= Date.now()
      ? publishedRelease
      : null;
  let setPolicy = (policy: GatePolicy) =>
    setAudience(
      policy.audience,
      policy.audience === "tiers" ? policy.tierIds : [],
    );

  let widerReleaseTimelineFact = useEntity(
    props.entityID,
    "block/members-only-wider-release-timeline",
  );
  let widerReleaseAudienceFact = useEntity(
    props.entityID,
    "block/members-only-wider-release-audience",
  );
  let widerReleaseTimeline = widerReleaseTimelineFact?.data.value;
  let mode: "unlock" | "early-access" = isWiderReleaseDelay(
    widerReleaseTimeline,
  )
    ? "early-access"
    : "unlock";

  let setWiderReleaseTimeline = (delay: WiderReleaseDelay) =>
    rep?.mutate.assertFact({
      entity: props.entityID,
      attribute: "block/members-only-wider-release-timeline",
      data: { type: "string", value: delay },
    });

  // Switching back to unlock keeps the wider-release audience fact, so
  // returning to early access restores the earlier choice.
  let setMode = (next: typeof mode) => {
    if (!rep || next === mode) return;
    if (next === "early-access") setWiderReleaseTimeline("week");
    else if (widerReleaseTimelineFact)
      rep.mutate.retractFact({ factID: widerReleaseTimelineFact.id });
  };

  // With no paid tiers, subscribers are the only audience — unless an older
  // gate is still set to paid members, which needs a way back.
  let showGateChecklist =
    props.tiers.length > 0 || props.policy.audience !== "subscribers";
  let gateChecklist = (
    <AudienceChecklist
      tiers={props.tiers}
      value={props.policy}
      onChange={setPolicy}
    />
  );

  return (
    <Popover
      asChild
      side="top"
      align="center"
      className="w-full sm:w-sm min-w-0 p-0!"
      trigger={
        <button
          type="button"
          aria-label="Choose which members can read past this point"
          onMouseDown={(e) => e.preventDefault()}
          className="flex items-center gap-0.5 underline decoration-dotted hover:text-accent-contrast min-w-0 grow"
        >
          <div className="truncate">
            {" "}
            {gateSummary(props.policy, props.tiers)}
          </div>
          <ArrowDownTiny className="shrink-0 scale-90" />
        </button>
      }
    >
      <div className="flex flex-col gap-3 text-primary font-normal min-h-0 overflow-y-auto p-3">
        <div className="font-bold">Gated Content Options</div>
        {pastRelease ? (
          <div className="light-container px-3 py-2 text-secondary">
            This post was released to{" "}
            {releaseAudienceLabel(pastRelease.audience, props.tiers)} on{" "}
            {new Date(pastRelease.at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            .
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <ToggleGroup
                fullWidth
                background="page"
                className="-mx-1"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "unlock", label: "Unlock Content" },
                  { value: "early-access", label: "Early Access" },
                ]}
              />
              <div className="text-sm text-tertiary leading-snug">
                {mode === "unlock"
                  ? "Show gated content to subscribers or members."
                  : "Show gated content to subscribers or members as soon as you publish. After some time, release it to a wider audience."}
              </div>
            </div>
            {mode === "unlock" ? (
              showGateChecklist && (
                <>
                  <hr />
                  <ChecklistSection label="Unlock this post for">
                    {gateChecklist}
                  </ChecklistSection>
                </>
              )
            ) : (
              <>
                <hr />

                <label className="flex items-center justify-between gap-2">
                  <div className="font-bold">Early Access Timeframe</div>
                  <select
                    className="input-with-border text-primary py-0.5 shrink-0 text-center"
                    value={widerReleaseTimeline}
                    onChange={(e) => {
                      if (isWiderReleaseDelay(e.target.value))
                        setWiderReleaseTimeline(e.target.value);
                    }}
                  >
                    {WIDER_RELEASE_DELAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <hr />

                {showGateChecklist && (
                  <ChecklistSection label="Early access for…">
                    {gateChecklist}
                  </ChecklistSection>
                )}
                <hr />

                <WiderReleaseChecklist
                  tiers={props.tiers}
                  policy={props.policy}
                  delayLabel={
                    WIDER_RELEASE_DELAYS.find(
                      (d) => d.value === widerReleaseTimeline,
                    )?.label
                  }
                  widerRelease={
                    widerReleaseAudienceFact?.data.value ?? {
                      audience: "public",
                    }
                  }
                  onChange={(value) =>
                    rep?.mutate.assertFact({
                      entity: props.entityID,
                      attribute: "block/members-only-wider-release-audience",
                      data: { type: "audience-union", value },
                    })
                  }
                />
              </>
            )}
          </>
        )}
      </div>
    </Popover>
  );
}

function releaseAudienceLabel(audience: AudiencePolicy, tiers: Tier[]) {
  if (audience.audience === "public") return "everyone";
  if (audience.audience === "subscribers") return "all subscribers";
  if (audience.audience === "paid") return "all paid members";
  const names = tiers
    .filter((t) => audience.tierIds.includes(t.id))
    .map((t) => t.name);
  return names.length > 0 ? names.join(", ") : "selected tiers";
}

function ChecklistSection(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-bold">{props.label}</div>
      {props.children}
    </div>
  );
}

function WiderReleaseChecklist(props: {
  tiers: Tier[];
  policy: GatePolicy;
  delayLabel: string | undefined;
  // Replicache hands back fact values deeply readonly.
  widerRelease: {
    audience: AudiencePolicy["audience"];
    tierIds?: readonly string[];
  };
  onChange: (value: AudiencePolicy) => void;
}) {
  let widerRelease: AudiencePolicy =
    props.widerRelease.audience === "tiers"
      ? {
          audience: "tiers",
          tierIds: (props.widerRelease.tierIds ?? []).filter((id) =>
            props.tiers.some((t) => t.id === id),
          ),
        }
      : { audience: props.widerRelease.audience };

  return (
    <ChecklistSection label={`After ${props.delayLabel}, release for…`}>
      {/* The wider release adds to the early-access audience, so everyone
          the gate already admits shows as included. */}
      <AudienceChecklist
        allowPublic
        tiers={props.tiers}
        value={widerReleaseAudience(props.policy, widerRelease)}
        onChange={props.onChange}
      />
    </ChecklistSection>
  );
}
