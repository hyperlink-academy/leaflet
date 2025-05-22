"use client";
import { callRPC } from "app/api/rpc/client";
import { createPublication } from "./createPublication";
import { ButtonPrimary } from "components/Buttons";
import { AddSmall } from "components/Icons/AddSmall";
import { InputWithLabel } from "components/Input";
import { useState, useRef, useEffect } from "react";
import { updatePublication } from "./updatePublication";
import { usePublicationData } from "../[did]/[publication]/dashboard/PublicationSWRProvider";
import { PubLeafletPublication } from "lexicons/api";
import { mutate } from "swr";
import { AddTiny } from "components/Icons/AddTiny";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";

export const EditPubForm = () => {
  let pubData = usePublicationData();
  let record = pubData?.record as PubLeafletPublication.Record;
  let [formState, setFormState] = useState<"normal" | "loading">("normal");

  let [nameValue, setNameValue] = useState(record?.name || "");
  let [descriptionValue, setDescriptionValue] = useState(
    record?.description || "",
  );
  let [iconFile, setIconFile] = useState<File | null>(null);
  let [iconPreview, setIconPreview] = useState<string | null>(null);
  let fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!pubData || !pubData.record) return;
    setNameValue(record.name);
    setDescriptionValue(record.description || "");
    if (record.icon)
      setIconPreview(
        `/api/atproto_images?did=${pubData.identity_did}&cid=${(record.icon.ref as unknown as { $link: string })["$link"]}`,
      );
  }, [pubData]);
  let toast = useToaster();

  return (
    <form
      className="flex flex-col gap-3 w-full py-1"
      onSubmit={async (e) => {
        if (!pubData) return;
        e.preventDefault();
        setFormState("loading");
        let data = await updatePublication({
          uri: pubData.uri,
          name: nameValue,
          description: descriptionValue,
          iconFile: iconFile,
        });
        toast({ type: "success", content: "Updated!" });
        setFormState("normal");
        mutate("publication-data");
      }}
    >
      <div className="flex items-center justify-between gap-2 ">
        <div className="text-center text-secondary flex flex-col ">
          <p className=" font-bold text-secondary">
            Logo{" "}
            <span className="italic text-tertiary font-normal">(optional)</span>
          </p>
        </div>
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
      <InputWithLabel
        type="text"
        id="pubName"
        label="Publication Name"
        value={nameValue}
        onChange={(e) => {
          setNameValue(e.currentTarget.value);
        }}
      />

      <InputWithLabel
        label="Description (optional)"
        textarea
        rows={3}
        id="pubDescription"
        value={descriptionValue}
        onChange={(e) => {
          setDescriptionValue(e.currentTarget.value);
        }}
      />

      <ButtonPrimary className="place-self-end" type="submit">
        {formState === "loading" ? <DotLoader /> : "Update Publication"}
      </ButtonPrimary>
    </form>
  );
};
