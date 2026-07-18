"use client";

import { useState, useEffect, useMemo } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { mutate } from "swr";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../PublicationSWRProvider";
import { updatePublication } from "app/(app)/lish/createPub/updatePublication";
import { PubDomainSettings } from "./PubDomainSettings";
import { GeneralSettings } from "./GeneralSettings";
import { PostSettings } from "./PostSettings";
import { ThemeSettings } from "./ThemeSettings";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { ManageProSubscription, NewsletterSettings } from "./ProSettings";
import { ContributorSettings } from "./ContributorSettings";
import {
  useIsPro,
  useCanSeePro,
  useCanSeePayments,
} from "src/hooks/useEntitlement";
import { useIdentityData } from "components/IdentityProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { InlineUpgradeToPro, UpgradeToProButton } from "../../UpgradeModal";
import { Modal } from "components/Modal";
import { Input } from "components/Input";
import { deletePublication } from "./deletePublication";
import { useRouter } from "next/navigation";
import { isOAuthSessionError, OAuthErrorMessage } from "components/OAuthError";
import { ConnectPayments } from "components/StripeConnect/ConnectPayments";

type SettingsView = "all" | "theme";

export function SettingsContent(props: { showPageBackground: boolean }) {
  let { data } = usePublicationData();
  let { publication: pubData } = data || {};
  let { identity } = useIdentityData();
  let isOwner =
    !!identity?.atp_did && identity.atp_did === pubData?.identity_did;
  let isPro = useIsPro();
  let canSeePro = useCanSeePro();
  let canSeePayments = useCanSeePayments();
  let record = useNormalizedPublicationRecord();
  let [loading, setLoading] = useState(false);
  let toast = useToaster();

  let [nameValue, setNameValue] = useState(record?.name || "");
  let [descriptionValue, setDescriptionValue] = useState(
    record?.description || "",
  );
  let [iconFile, setIconFile] = useState<File | null>(null);
  let [iconPreview, setIconPreview] = useState<string | null>(null);

  let [showInDiscover, setShowInDiscover] = useState(
    record?.preferences?.showInDiscover === undefined
      ? true
      : record.preferences.showInDiscover,
  );

  // --- Post Settings state ---
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

  // Sync from server data
  useEffect(() => {
    if (!pubData || !pubData.record || !record) return;
    setNameValue(record.name);
    setDescriptionValue(record.description || "");
    if (record.icon)
      setIconPreview(
        blobRefToSrc(record.icon.ref, pubData.identity_did, undefined, {
          width: 360,
        }),
      );
  }, [pubData, record]);

  let hasUnsavedChanges = useMemo(() => {
    if (!record) return false;
    if (nameValue !== (record.name || "")) return true;
    if (descriptionValue !== (record.description || "")) return true;
    if (iconFile !== null) return true;

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

    return false;
  }, [
    record,
    nameValue,
    descriptionValue,
    iconFile,
    showInDiscover,
    showComments,
    showMentions,
    showRecommends,
    showPrevNext,
    showFirstLast,
  ]);

  // Contributors (non-owners) only get the contributor settings — they can't
  // edit the publication's general/theme/post/domain/pro settings or delete it.
  if (!isOwner) {
    return (
      <div className="flex flex-col w-full pb-8">
        <div className="flex flex-col gap-6 relative">
          <ContributorSettings />
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col w-full pb-8"
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
            preferences: {
              showInDiscover,
              showComments,
              showMentions,
              showPrevNext,
              showFirstLast,
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
        mutate("publication-data");
      }}
    >
      <div className="flex flex-col gap-6 relative ">
        {/* ── General Settings ── */}
        <GeneralSettings
          nameValue={nameValue}
          setNameValue={setNameValue}
          descriptionValue={descriptionValue}
          setDescriptionValue={setDescriptionValue}
          iconPreview={iconPreview}
          setIconPreview={setIconPreview}
          setIconFile={setIconFile}
          onIconError={(content) => toast({ type: "error", content })}
        />

        <DashboardContainer section="Theme and Layout">
          <ThemeSettings />
        </DashboardContainer>

        {/* ── Post Settings ── */}
        <PostSettings
          showComments={showComments}
          setShowComments={setShowComments}
          showMentions={showMentions}
          setShowMentions={setShowMentions}
          showRecommends={showRecommends}
          setShowRecommends={setShowRecommends}
          showPrevNext={showPrevNext}
          setShowPrevNext={setShowPrevNext}
          showFirstLast={showFirstLast}
          setShowFirstLast={setShowFirstLast}
          showInDiscover={showInDiscover}
          setShowInDiscover={setShowInDiscover}
        />

        <DashboardContainer section="Domains">
          <div className="text-secondary">
            <PubDomainSettings />
          </div>
        </DashboardContainer>

        <ContributorSettings />

        {canSeePayments && (
          <DashboardContainer section="Monetization">
            <ConnectPayments />
          </DashboardContainer>
        )}

        {canSeePro && !isPro ? (
          <DashboardContainer section="Leaflet Pro" className="pb-4">
            <UpgradeToProButton />
          </DashboardContainer>
        ) : (
          <>
            <DashboardContainer section="Leaflet Pro" className="pb-4">
              <ManageProSubscription compact />
            </DashboardContainer>
            <NewsletterSettings />
          </>
        )}
        <div className="flex flex-col gap-1">
          <hr className="border-border border-2" />
          <hr className="border-border border-2" />
        </div>

        <DashboardContainer section="DANGER!" className="pb-4">
          <DeletePublication />
        </DashboardContainer>

        {hasUnsavedChanges && <SettingsFooter loading={loading} />}
      </div>
    </form>
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

export const DashboardContainer = (props: {
  children: React.ReactNode;
  className?: string;
  section?: React.ReactNode;
}) => {
  let cardBorderHidden = useCardBorderHidden();
  return (
    <div
      className={`container flex flex-col rounded-lg! gap-2 p-3 sm:px-4 ${!cardBorderHidden ? "" : "bg-transparent!"} ${props.className}`}
    >
      {props.section && (
        <>
          <h3 className="font-bold text-primary flex items-center gap-2">
            {props.section}
          </h3>
          <hr className="-mt-1 mb-2 border-border-light" />
        </>
      )}
      {props.children}
    </div>
  );
};

let pluralize = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

const DeletePublication = () => {
  let [value, setValue] = useState("");
  let [deleting, setDeleting] = useState(false);
  let record = useNormalizedPublicationRecord();
  let { data: pub } = usePublicationData();
  let postCount = pub?.documents?.length ?? 0;
  let draftCount = pub?.drafts?.length ?? 0;
  let subCount = pub?.publication?.publication_subscriptions?.length ?? 0;
  let toaster = useToaster();
  let router = useRouter();
  let pubUri = pub?.publication?.uri;

  let onDelete = async () => {
    if (
      !pubUri ||
      record?.name?.toLowerCase() !== value.toLowerCase() ||
      deleting
    )
      return;
    setDeleting(true);
    let result = await deletePublication(pubUri);
    if (!result.success) {
      setDeleting(false);
      toaster({
        type: "error",
        content: isOAuthSessionError(result.error) ? (
          <OAuthErrorMessage error={result.error} />
        ) : typeof result.error === "string" ? (
          result.error
        ) : (
          "We couldn't delete the publication. Please try again!"
        ),
      });
      return;
    }
    toaster({
      type: "success",
      content: `${record?.name ?? "Publication"} deleted`,
    });
    router.push("/home");
  };

  return (
    <Modal
      asChild
      className="text-center"
      trigger={<ButtonPrimary>Delete Publication</ButtonPrimary>}
      title="Are you sure?"
    >
      <div className="text-secondary flex flex-col max-w-prose">
        <div className="pb-3 text-left">
          This will permanently delete:
          <ul className="list-disc pl-5 pt-1">
            <li>This publication and its settings</li>
            <li>
              {pluralize(postCount, "published post")}
              {postCount > 0 ? " (removed from your PDS)" : ""}
            </li>
            <li>{pluralize(draftCount, "draft")}</li>
            <li>All associated records on your PDS</li>
          </ul>
          {subCount > 0 && (
            <div className="pt-2">
              {pluralize(subCount, "subscriber")} will lose access.
            </div>
          )}
          <div className="pt-2 font-bold text-primary">
            This cannot be undone.
          </div>
        </div>
        <div className="font-bold pb-1">
          Enter the name of this publication to confirm
        </div>

        <Input
          className="input-with-border w-full mb-3 text-primary max-w-prose"
          placeholder={record?.name ? record.name : "Publication Name"}
          type="text"
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
        />
        <ButtonPrimary
          className="mx-auto mb-1"
          disabled={
            record?.name?.toLowerCase() !== value.toLowerCase() ||
            deleting ||
            !pubUri
          }
          onClick={onDelete}
        >
          {deleting ? <DotLoader /> : "Delete Publication"}
        </ButtonPrimary>
      </div>
    </Modal>
  );
};
