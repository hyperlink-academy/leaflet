"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { RecommendationSettings } from "./RecommendedPubsSetting";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../PublicationSWRProvider";
import { updatePublication } from "actions/publications/updatePublication";
import { PubDomainSettings } from "./PubDomainSettings";
import { GeneralSettings } from "./GeneralSettings";
import { ThemeAndLayoutSettings } from "./ThemeAndLayoutSettings";
import { ShareSettings } from "./ShareSettings";
import { NewsletterSettings } from "./NewsletterSettings";
import { ContributorSettings } from "./ContributorSettings";
import { MonetizationSettings } from "./MonetizationSettings";
import { useIsPro, useCanSeePayments } from "src/hooks/useEntitlement";
import { useIdentityData } from "components/IdentityProvider";
import { isOAuthSessionError, OAuthErrorMessage } from "components/OAuthError";
import { SettingsPageLayout, SettingsSection } from "components/SettingsLayout";
import {
  resolvePrevNextDirection,
  type PrevNextDirection,
} from "src/utils/mergePreferences";
import { DeletePublication } from "./DeletePublicationSection";
import { UpgradeContent } from "app/(app)/(published)/lish/[did]/[publication]/UpgradeModal";

export type PubSettingsTab =
  | "general"
  | "monetization"
  | "contributors"
  | "newsletter";

// The tabs the current viewer can see; non-owners (contributors) get none and
// see only the contributor view.
export function usePubSettingsTabs(): {
  value: PubSettingsTab;
  label: string;
}[] {
  let { data } = usePublicationData();
  let { identity } = useIdentityData();
  let isOwner =
    !!identity?.atp_did && identity.atp_did === data?.publication?.identity_did;
  let canSeePayments = useCanSeePayments();

  if (!isOwner) return [];
  // Contributors and Newsletter are Pro features, but non-Pro owners still get
  // the tabs — those panes show the upgrade pitch instead of the settings.
  return [
    { value: "general" as const, label: "General" },
    ...(canSeePayments
      ? [{ value: "monetization" as const, label: "Monetization" }]
      : []),
    { value: "contributors" as const, label: "Contributors" },
    { value: "newsletter" as const, label: "Newsletter" },
  ];
}

export function SettingsContent(props: { tab: PubSettingsTab }) {
  let { data, mutate } = usePublicationData();
  let { publication: pubData } = data || {};
  let { identity } = useIdentityData();
  let isOwner =
    !!identity?.atp_did && identity.atp_did === pubData?.identity_did;
  let isPro = useIsPro();
  let record = useNormalizedPublicationRecord();
  let [loading, setLoading] = useState(false);
  let toast = useToaster();

  let [nameValue, setNameValue] = useState(record?.name || "");
  let [descriptionValue, setDescriptionValue] = useState(
    record?.description || "",
  );
  let [iconFile, setIconFile] = useState<File | null>(null);
  let [iconPreview, setIconPreview] = useState<string | null>(null);
  // Removal is tracked separately from the preview so a background revalidation
  // (which re-syncs iconPreview from the record) can't resurrect a removed icon.
  let [iconRemoved, setIconRemoved] = useState(false);

  let [showInDiscover, setShowInDiscover] = useState(
    record?.preferences?.showInDiscover === undefined
      ? true
      : record.preferences.showInDiscover,
  );
  let [showComments, setShowComments] = useState(
    record?.preferences?.showComments === undefined
      ? true
      : record.preferences.showComments,
  );
  let [showMentions, setShowMentions] = useState(
    record?.preferences?.showMentions === undefined
      ? true
      : record.preferences.showMentions,
  );
  let [showRecommends, setShowRecommends] = useState(
    record?.preferences?.showRecommends === undefined
      ? true
      : record.preferences.showRecommends,
  );
  let [showPrevNext, setShowPrevNext] = useState(
    record?.preferences?.showPrevNext === undefined
      ? true
      : record.preferences.showPrevNext,
  );
  let [showFirstLast, setShowFirstLast] = useState(
    record?.preferences?.showFirstLast === undefined
      ? false
      : record.preferences.showFirstLast,
  );
  let [prevNextDirection, setPrevNextDirection] = useState<PrevNextDirection>(
    resolvePrevNextDirection(record?.preferences?.prevNextDirection),
  );

  // null until the saved recommendations load, in which case saving omits
  // recommendations entirely so an early save can't wipe them.
  let [recommendations, setRecommendations] = useState<string[] | null>(null);

  // Saved recommendations live in their own pub.leaflet.graph.recommendations
  // record, not on the publication record, so they load separately.
  let { data: savedRecommendations, mutate: mutateRecommendations } = useSWR(
    pubData?.uri ? ["publication_recommendations", pubData.uri] : null,
    async () => {
      let res = await callRPC("get_publication_recommendations", {
        publication: pubData!.uri,
      });
      return res.result.recommendations;
    },
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (savedRecommendations !== undefined)
      setRecommendations(savedRecommendations);
  }, [savedRecommendations]);

  // Sync from server data
  useEffect(() => {
    if (!pubData || !pubData.record || !record) return;
    setNameValue(record.name);
    setDescriptionValue(record.description || "");
    if (record.icon)
      setIconPreview(
        `/api/atproto_images?did=${pubData.identity_did}&cid=${(record.icon.ref as unknown as { $link: string })["$link"]}`,
      );
  }, [pubData, record]);

  let hasUnsavedChanges = useMemo(() => {
    if (!record) return false;
    if (nameValue !== (record.name || "")) return true;
    if (descriptionValue !== (record.description || "")) return true;
    if (iconFile !== null) return true;
    if (iconRemoved && record.icon) return true;

    let savedShowInDiscover =
      record.preferences?.showInDiscover === undefined
        ? true
        : record.preferences.showInDiscover;
    if (showInDiscover !== savedShowInDiscover) return true;

    let savedShowComments =
      record.preferences?.showComments === undefined
        ? true
        : record.preferences.showComments;
    if (showComments !== savedShowComments) return true;

    let savedShowMentions =
      record.preferences?.showMentions === undefined
        ? true
        : record.preferences.showMentions;
    if (showMentions !== savedShowMentions) return true;

    let savedShowRecommends =
      record.preferences?.showRecommends === undefined
        ? true
        : record.preferences.showRecommends;
    if (showRecommends !== savedShowRecommends) return true;

    let savedShowPrevNext =
      record.preferences?.showPrevNext === undefined
        ? true
        : record.preferences.showPrevNext;
    if (showPrevNext !== savedShowPrevNext) return true;

    let savedShowFirstLast =
      record.preferences?.showFirstLast === undefined
        ? false
        : record.preferences.showFirstLast;
    if (showFirstLast !== savedShowFirstLast) return true;

    if (
      prevNextDirection !==
      resolvePrevNextDirection(record.preferences?.prevNextDirection)
    )
      return true;

    if (recommendations !== null) {
      let saved = savedRecommendations ?? [];
      if (
        recommendations.length !== saved.length ||
        recommendations.some((r, i) => r !== saved[i])
      )
        return true;
    }

    return false;
  }, [
    record,
    savedRecommendations,
    nameValue,
    descriptionValue,
    iconFile,
    iconRemoved,
    showInDiscover,
    showComments,
    showMentions,
    showRecommends,
    showPrevNext,
    showFirstLast,
    prevNextDirection,
    recommendations,
  ]);

  // Contributors (non-owners) only get the contributor settings — they can't
  // edit the publication's general/theme/post/domain/pro settings or delete it.
  if (!isOwner) {
    return (
      <SettingsPageLayout>
        <ContributorSettings />
      </SettingsPageLayout>
    );
  }

  if (props.tab === "monetization") {
    return (
      <SettingsPageLayout>
        <MonetizationSettings />
      </SettingsPageLayout>
    );
  }

  if (props.tab === "contributors") {
    return (
      <SettingsPageLayout>
        {isPro ? <ContributorSettings /> : <UpgradeSection />}
      </SettingsPageLayout>
    );
  }

  if (props.tab === "newsletter") {
    return (
      <SettingsPageLayout>
        {isPro ? <NewsletterSettings /> : <UpgradeSection />}
      </SettingsPageLayout>
    );
  }

  return (
    <form
      className="flex flex-col w-full"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!pubData) return;
        setLoading(true);
        let result;
        try {
          result = await updatePublication({
            uri: pubData.uri,
            name: nameValue,
            description: descriptionValue,
            iconFile: iconFile,
            removeIcon: iconRemoved,
            ...(recommendations !== null && { recommendations }),
            preferences: {
              showInDiscover,
              showComments,
              showMentions,
              showPrevNext,
              showFirstLast,
              prevNextDirection,
              showRecommends,
            },
          });
        } catch {
          setLoading(false);
          toast({
            type: "error",
            content: "We couldn't save your settings. Please try again!",
          });
          return;
        }
        setLoading(false);

        if (!result.success) {
          toast({
            type: "error",
            content: isOAuthSessionError(result.error) ? (
              <OAuthErrorMessage error={result.error} />
            ) : (
              "We couldn't save your settings. Please try again!"
            ),
          });
          return;
        }

        toast({ type: "success", content: "Settings saved!" });
        if (iconRemoved) setIconPreview(null);
        setIconFile(null);
        setIconRemoved(false);
        if (recommendations !== null)
          mutateRecommendations(recommendations, { revalidate: false });
        mutate();
      }}
    >
      <SettingsPageLayout className="relative">
        <GeneralSettings
          nameValue={nameValue}
          setNameValue={setNameValue}
          descriptionValue={descriptionValue}
          setDescriptionValue={setDescriptionValue}
          iconPreview={iconRemoved ? null : iconPreview}
          setIcon={(file, preview) => {
            setIconFile(file);
            setIconPreview(preview);
            setIconRemoved(false);
          }}
          removeIcon={() => {
            setIconFile(null);
            setIconRemoved(true);
          }}
          onIconError={(content) => toast({ type: "error", content })}
        />

        <RecommendationSettings
          publicationUri={pubData?.uri ?? ""}
          recommendations={recommendations}
          setRecommendations={setRecommendations}
        />

        <ThemeAndLayoutSettings
          showPrevNext={showPrevNext}
          setShowPrevNext={setShowPrevNext}
          showFirstLast={showFirstLast}
          setShowFirstLast={setShowFirstLast}
          prevNextDirection={prevNextDirection}
          setPrevNextDirection={setPrevNextDirection}
        />

        <ShareSettings
          showComments={showComments}
          setShowComments={setShowComments}
          showMentions={showMentions}
          setShowMentions={setShowMentions}
          showRecommends={showRecommends}
          setShowRecommends={setShowRecommends}
          showInDiscover={showInDiscover}
          setShowInDiscover={setShowInDiscover}
        />

        <SettingsSection title="Domains">
          <div className="text-secondary">
            <PubDomainSettings />
          </div>
        </SettingsSection>

        <SettingsSection title="DANGER!" className="pb-4">
          <DeletePublication />
        </SettingsSection>

        {hasUnsavedChanges && <SettingsFooter loading={loading} />}
      </SettingsPageLayout>
    </form>
  );
}

function UpgradeSection() {
  return (
    <SettingsSection>
      <div className="mx-auto sm:py-4"><UpgradeContent /></div>
    </SettingsSection>
  );
}

function SettingsFooter(props: { loading: boolean }) {
  let [distanceFromBottom, setDistanceFromBottom] = useState<number>(Infinity);

  useEffect(() => {
    const scrollContainer = document.getElementById("home-content");
    if (!scrollContainer) return;

    const handleScroll = () => {
      const dist =
        scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight;
      setDistanceFromBottom(dist);
    };

    handleScroll();
    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  const threshold = 100;
  // ratio: 1 = far from bottom (full margin), 0 = at bottom (no margin)
  const ratio = Math.min(distanceFromBottom / threshold, 1);
  const mx = ratio * 8; // 8px = mx-2

  return (
    <div
      className="settingsFooter sticky bottom-0 z-10"
      style={{
        paddingLeft: `${mx}px`,
        paddingRight: `${mx}px`,
        paddingBottom: `${mx}px`,
      }}
    >
      <div className="bg-[rgb(var(--accent-1))] text-accent-2 text-sm rounded-md border-border-light pr-1 pl-2 flex justify-between items-center py-1">
        You have unsaved updates!
        <ButtonSecondary type="submit" disabled={props.loading}>
          {props.loading ? <DotLoader /> : "Update Pub"}
        </ButtonSecondary>
      </div>
    </div>
  );
}
