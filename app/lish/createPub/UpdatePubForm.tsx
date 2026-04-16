"use client";
import { ButtonPrimary } from "components/Buttons";
import { Input } from "components/Input";
import { useState, useRef, useEffect } from "react";
import { updatePublication } from "./updatePublication";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../[did]/[publication]/dashboard/PublicationSWRProvider";
import { mutate } from "swr";
import { AddTiny } from "components/Icons/AddTiny";
import { useToaster } from "components/Toast";
import { Toggle } from "components/Toggle";

export const EditPubForm = (props: {
  backToMenuAction: () => void;
  loading: boolean;
  setLoadingAction: (l: boolean) => void;
}) => {
  let { data } = usePublicationData();
  let { publication: pubData } = data || {};
  let record = useNormalizedPublicationRecord();
  let [formState, setFormState] = useState<"normal" | "loading">("normal");

  let [nameValue, setNameValue] = useState(record?.name || "");
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
  let showMentions =
    record?.preferences?.showMentions === undefined
      ? true
      : record.preferences.showMentions;
  let showPrevNext =
    record?.preferences?.showPrevNext === undefined
      ? true
      : record.preferences.showPrevNext;

  let [descriptionValue, setDescriptionValue] = useState(
    record?.description || "",
  );
  let [iconFile, setIconFile] = useState<File | null>(null);
  let [iconPreview, setIconPreview] = useState<string | null>(null);
  let fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!pubData || !pubData.record || !record) return;
    setNameValue(record.name);
    setDescriptionValue(record.description || "");
    if (record.icon)
      setIconPreview(
        `/api/atproto_images?did=${pubData.identity_did}&cid=${(record.icon.ref as unknown as { $link: string })["$link"]}`,
      );
  }, [pubData, record]);
  let toast = useToaster();

  return (
    <form
      className="min-h-0 flex-1 flex flex-col pb-2"
      onSubmit={async (e) => {
        if (!pubData) return;
        e.preventDefault();
        props.setLoadingAction(true);
        let data = await updatePublication({
          uri: pubData.uri,
          name: nameValue,
          description: descriptionValue,
          iconFile: iconFile,
          preferences: {
            showInDiscover: showInDiscover,
            showComments: showComments,
            showMentions: showMentions,
            showPrevNext: showPrevNext,
            showRecommends: record?.preferences?.showRecommends ?? true,
          },
        });
        toast({ type: "success", content: "Updated!" });
        props.setLoadingAction(false);
        mutate("publication-data");
      }}
    >

      <div className="flex flex-col gap-3 w-[1000px] max-w-full pb-2 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between gap-2 mt-2 ">
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
                reader.onload = (e) => {
                  setIconPreview(e.target?.result as string);
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
            onChange={(e) => {
              setNameValue(e.currentTarget.value);
            }}
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
            onChange={(e) => {
              setDescriptionValue(e.currentTarget.value);
            }}
          />
        </label>

        <Toggle
          toggle={showInDiscover}
          onToggle={() => setShowInDiscover(!showInDiscover)}
        >
          <div className=" pt-0.5 flex flex-col  text-sm text-tertiary ">
            <p className="font-bold italic">Make Public</p>
            <p className="text-sm text-tertiary font-normal">
              Your posts will appear in{" "}
              <a href="/reader" target="_blank">
                Leaflet Reader
              </a>{" "}
              and show up in search and tags. You can change this at any time!
            </p>
          </div>
        </Toggle>
      </div>
    </form>
  );
};
