"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "components/Input";
import { Toggle } from "components/Toggle";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { AddTiny } from "components/Icons/AddTiny";
import { useToaster } from "components/Toast";
import { mutate } from "swr";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../PublicationSWRProvider";
import { updatePublication } from "app/lish/createPub/updatePublication";
import { DomainsInline } from "./DomainsInline";
import { PubThemeSetter } from "components/ThemeManager/PubThemeSetter";

type SettingsView = "all" | "theme";

export function SettingsTab(props: { showPageBackground: boolean }) {
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
  let fileInputRef = useRef<HTMLInputElement>(null);

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
        <section className="flex flex-col gap-3">
          <h3 className="font-bold text-primary">General Settings</h3>

          <div className="flex items-center justify-between gap-2">
            <p className="pl-0.5 pb-0.5 text-tertiary italic text-sm font-bold">
              Logo <span className="font-normal">(optional)</span>
            </p>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer  ${iconPreview ? "border border-border-light hover:outline-border" : "border border-dotted border-accent-contrast hover:outline-accent-contrast"} selected-outline`}
              onClick={() => fileInputRef.current?.click()}
            >
              {iconPreview ? (
                <img
                  src={iconPreview}
                  alt="Logo preview"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <AddTiny className="text-accent-1" />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setIconFile(file);
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setIconPreview(ev.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>

          <label>
            <p className="pl-0.5 pb-0.5 text-tertiary italic text-sm font-bold">
              Publication Name
            </p>
            <Input
              className="input-with-border w-full text-primary"
              type="text"
              id="pubName"
              value={nameValue}
              onChange={(e) => setNameValue(e.currentTarget.value)}
            />
          </label>

          <label>
            <p className="text-tertiary italic text-sm font-bold pl-0.5 pb-0.5">
              Description <span className="font-normal">(optional)</span>
            </p>
            <Input
              textarea
              className="input-with-border w-full text-primary"
              rows={3}
              id="pubDescription"
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.currentTarget.value)}
            />
          </label>

          <Toggle
            toggle={showInDiscover}
            onToggle={() => setShowInDiscover(!showInDiscover)}
          >
            <div className="pt-0.5 flex flex-col text-sm text-tertiary">
              <p className="font-bold italic">Show In Discover</p>
              <p className="text-xs text-tertiary font-normal">
                Your posts will appear in{" "}
                <a href="/reader" target="_blank">
                  Leaflet Reader
                </a>
                . You can change this at any time!
              </p>
            </div>
          </Toggle>
        </section>

        <hr className="border-border-light" />

        {/* ── Post Settings ── */}
        <section className="flex flex-col gap-3">
          <h3 className="font-bold text-primary">Post Settings</h3>

          <h4 className="mb-0">Layout</h4>
          <Toggle
            toggle={showPrevNext}
            onToggle={() => setShowPrevNext(!showPrevNext)}
          >
            <div className="font-bold">Show Prev/Next Buttons</div>
          </Toggle>

          <hr className="border-border-light" />

          <h4 className="mb-0">Interactions</h4>
          <div className="flex flex-col gap-2">
            <Toggle
              toggle={showComments}
              onToggle={() => setShowComments(!showComments)}
            >
              <div className="font-bold">Show Comments</div>
            </Toggle>

            <Toggle
              toggle={showMentions}
              onToggle={() => setShowMentions(!showMentions)}
            >
              <div className="flex flex-col justify-start">
                <div className="font-bold">Show Mentions</div>
                <div className="text-tertiary text-sm leading-tight">
                  Display a list of Bluesky mentions about your post
                </div>
              </div>
            </Toggle>

            <Toggle
              toggle={showRecommends}
              onToggle={() => setShowRecommends(!showRecommends)}
            >
              <div className="flex flex-col justify-start">
                <div className="font-bold">Show Recommends</div>
                <div className="text-tertiary text-sm leading-tight">
                  Allow readers to recommend/like your post
                </div>
              </div>
            </Toggle>
          </div>
        </section>

        <hr className="border-border-light" />

        {/* ── Theme ── */}
        <section className="flex flex-col gap-3">
          <h3 className="font-bold text-primary">Theme and Layout</h3>
          <button
            type="button"
            className="text-left text-sm text-accent-contrast font-bold hover:underline w-fit"
            onClick={props.onOpenTheme}
          >
            Customize Theme &rarr;
          </button>
        </section>

        <hr className="border-border-light" />

        {/* ── Domains ── */}
        <DomainsInline />
      </div>

      {/* ── Sticky Save Footer ── */}
      <div className="sticky bottom-0 left-0 right-0 bg-bg-page border-t border-border-light py-3 mt-6 -mx-3 px-3 flex justify-end">
        <ButtonPrimary type="submit" disabled={loading}>
          {loading ? <DotLoader /> : "Save Changes"}
        </ButtonPrimary>
      </div>
    </form>
  );
}
