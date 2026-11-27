import {
  fromAudienceUnion,
  isWiderReleaseDelay,
  toAudienceUnion,
  type AudiencePolicy,
  type AudienceUnion,
  type GatePolicy,
  type WiderReleaseDelay,
} from "src/membership";

// publications.defaults holds editor choices a publication remembers so the
// next one starts from them. Each section is read on its own and anything
// invalid reads as absent, so a bad section never breaks the others.
// Audiences are stored as the pub.leaflet.audience union.

export type ContentGateDefaults = {
  audience: AudienceUnion;
  // Null for an Unlock Content gate.
  widerRelease: { timeline: WiderReleaseDelay; audience: AudienceUnion } | null;
};

// A content gate's options in the form the editor works with.
export type ContentGateConfig = {
  audience: GatePolicy;
  widerRelease: {
    timeline: WiderReleaseDelay;
    audience: AudiencePolicy;
  } | null;
};

export function toContentGateDefaults(
  config: ContentGateConfig,
): ContentGateDefaults {
  return {
    audience: toAudienceUnion(config.audience),
    widerRelease: config.widerRelease && {
      timeline: config.widerRelease.timeline,
      audience: toAudienceUnion(config.widerRelease.audience),
    },
  };
}

// A stored content gate, or null when it isn't a valid one.
export function readContentGateDefaults(
  value: unknown,
): ContentGateConfig | null {
  const v = value as
    | { audience?: unknown; widerRelease?: unknown }
    | null
    | undefined;
  const audience = fromAudienceUnion(v?.audience);
  // A gate's own audience can't be public; only its wider release can.
  if (!audience || audience.audience === "public") return null;
  if (v?.widerRelease == null) return { audience, widerRelease: null };
  const release = v.widerRelease as { timeline?: unknown; audience?: unknown };
  const releaseAudience = fromAudienceUnion(release.audience);
  if (!isWiderReleaseDelay(release.timeline) || !releaseAudience) return null;
  return {
    audience,
    widerRelease: { timeline: release.timeline, audience: releaseAudience },
  };
}

// The publication's remembered gate, checked against the tiers it offers now:
// retired tiers are dropped, and a choice that no longer admits anyone (a paid
// gate with no paid tiers, a tier gate whose tiers are all gone) is discarded
// so the caller falls back to its default.
export function savedContentGate(
  defaults: unknown,
  activeTierIds: string[],
): ContentGateConfig | null {
  const saved = readContentGateDefaults(
    (defaults as { contentGate?: unknown } | null | undefined)?.contentGate,
  );
  if (!saved) return null;
  const audience = policyForTiers(saved.audience, activeTierIds);
  if (!audience || audience.audience === "public") return null;
  const releaseAudience =
    saved.widerRelease &&
    policyForTiers(saved.widerRelease.audience, activeTierIds);
  return {
    audience,
    widerRelease:
      saved.widerRelease && releaseAudience
        ? { timeline: saved.widerRelease.timeline, audience: releaseAudience }
        : null,
  };
}

function policyForTiers(
  policy: AudiencePolicy,
  activeTierIds: string[],
): AudiencePolicy | null {
  if (policy.audience === "paid") return activeTierIds.length ? policy : null;
  if (policy.audience !== "tiers") return policy;
  const tierIds = policy.tierIds.filter((id) => activeTierIds.includes(id));
  return tierIds.length ? { audience: "tiers", tierIds } : null;
}

// Custom subscribe-box text from the CTA settings tab. A blank field is
// stored as absent so the box falls back to its built-in text.
export type CtaText = {
  header?: string;
  upgradeHeader?: string;
  description?: string;
};
export type CtaSection = "general" | "locked" | "earlyAccess";
export type CtaDefaults = Partial<Record<CtaSection, CtaText>>;

export const CTA_SECTIONS: readonly CtaSection[] = [
  "general",
  "locked",
  "earlyAccess",
];
// Abuse guards only: this text loads on every subscribe box and paywall.
export const CTA_HEADER_MAX_LENGTH = 2000;
export const CTA_DESCRIPTION_MAX_LENGTH = 10000;

export function isCtaSection(value: unknown): value is CtaSection {
  return CTA_SECTIONS.includes(value as CtaSection);
}

// One section's text, trimmed with blanks dropped; null when a field isn't a
// string or is too long. General has no upgrade header.
export function readCtaText(
  section: CtaSection,
  value: unknown,
): CtaText | null {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const text: CtaText = {};
  const fields = [
    ["header", CTA_HEADER_MAX_LENGTH],
    ...(section === "general"
      ? []
      : ([["upgradeHeader", CTA_HEADER_MAX_LENGTH]] as const)),
    ["description", CTA_DESCRIPTION_MAX_LENGTH],
  ] as const;
  for (const [key, max] of fields) {
    const raw = v[key];
    if (raw == null) continue;
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (trimmed.length > max) return null;
    if (trimmed) text[key] = trimmed;
  }
  return text;
}

// Which kind of field, if any, is over its limit, for telling the writer why a
// save was refused. An upgrade header counts as a header.
export function ctaTooLongField(
  value: unknown,
): "header" | "description" | null {
  const v = (value ?? {}) as Record<string, unknown>;
  const tooLong = (key: string, max: number) =>
    typeof v[key] === "string" && (v[key] as string).trim().length > max;
  if (
    tooLong("header", CTA_HEADER_MAX_LENGTH) ||
    tooLong("upgradeHeader", CTA_HEADER_MAX_LENGTH)
  )
    return "header";
  if (tooLong("description", CTA_DESCRIPTION_MAX_LENGTH)) return "description";
  return null;
}

export function savedCtaDefaults(defaults: unknown): CtaDefaults {
  const cta = (defaults as { cta?: unknown } | null | undefined)?.cta;
  const result: CtaDefaults = {};
  if (!cta || typeof cta !== "object") return result;
  for (const section of CTA_SECTIONS) {
    const text = readCtaText(
      section,
      (cta as Record<string, unknown>)[section],
    );
    if (text && Object.keys(text).length) result[section] = text;
  }
  return result;
}
