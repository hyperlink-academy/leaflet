"use client";

import { useState, useEffect } from "react";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { mutate } from "swr";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../PublicationSWRProvider";
import { updatePublication } from "app/lish/createPub/updatePublication";
import { DomainsInline } from "./DomainsInline";
import { PubThemeSetter } from "components/ThemeManager/PubThemeSetter";
import { GeneralSettings } from "./GeneralSettings";
import { PostSettings } from "./PostSettings";
import { ThemeSettings } from "./ThemeSettings";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";

type SettingsView = "all" | "theme";

export function SettingsContent(props: { showPageBackground: boolean }) {
  let [view, setView] = useState<SettingsView>("all");
  let [themeLoading, setThemeLoading] = useState(false);

  if (view === "theme") {
    return (
      <div className="flex flex-col gap-0 w-full max-w-xl pb-8">
        <PubThemeSetter
          backToMenu={() => setView("all")}
          loading={themeLoading}
          setLoading={setThemeLoading}
        />
      </div>
    );
  }

  return <SettingsForm onOpenTheme={() => setView("theme")} />;
}

function SettingsForm(props: { onOpenTheme: () => void }) {
  let { data } = usePublicationData();
  let { publication: pubData } = data || {};
  let record = useNormalizedPublicationRecord();
  let [loading, setLoading] = useState(false);
  let toast = useToaster();

  // --- General Settings state ---
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

  return (
    <form
      className="flex flex-col w-full max-w-xl pb-20"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!pubData) return;
        setLoading(true);
        await updatePublication({
          uri: pubData.uri,
          name: nameValue,
          description: descriptionValue,
          iconFile: iconFile,
          preferences: {
            showInDiscover,
            showComments,
            showMentions,
            showPrevNext,
            showRecommends,
          },
        });
        toast({ type: "success", content: "Settings saved!" });
        setLoading(false);
        mutate("publication-data");
      }}
    >
      <div className="flex flex-col gap-6">
        {/* ── General Settings ── */}
        <GeneralSettings
          nameValue={nameValue}
          setNameValue={setNameValue}
          descriptionValue={descriptionValue}
          setDescriptionValue={setDescriptionValue}
          iconPreview={iconPreview}
          setIconPreview={setIconPreview}
          setIconFile={setIconFile}
        />

        <hr className="border-border-light" />

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
          showInDiscover={showInDiscover}
          setShowInDiscover={setShowInDiscover}
        />

        <hr className="border-border-light" />

        {/* ── Theme ── */}
        <ThemeSettings onOpenTheme={props.onOpenTheme} />

        <hr className="border-border-light" />

        {/* ── Domains ── */}
        <DomainsInline />
      </div>

      {/* ── Sticky Save Footer ── */}
      <div className="opaque-container sticky bottom-4 left-0 right-0 bg-bg-page border-t border-border-light p-2   px-2 flex justify-end">
        <ButtonPrimary type="submit" disabled={loading}>
          {loading ? <DotLoader /> : "Save Changes"}
        </ButtonPrimary>
      </div>
    </form>
  );
}

export const DashboardContainer = (props: {
  children: React.ReactNode;
  className?: string;
}) => {
  let cardBorderHidden = useCardBorderHidden();
  return (
    <div
      className={`flex flex-col ${cardBorderHidden ? "con" : "bg-transparent"}`}
    >
      {props.children}
    </div>
  );
};
