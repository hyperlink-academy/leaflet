"use client";

import { useState } from "react";
import { AdminImportGhost } from "./AdminImportGhost";
import { AdminImportOffprint } from "./AdminImportOffprint";

type Source = "ghost" | "offprint";

export function AdminImport() {
  let [source, setSource] = useState<Source>("ghost");
  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h2>Import posts</h2>
        <div className="text-secondary leading-snug">
          Bring posts from another platform into a publication as drafts,
          optionally publishing them on the publication owner&apos;s behalf.
          Images are copied into Leaflet storage. Subscribers are never emailed
          about imported posts.
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3>Source</h3>
        <SourceRadio
          value="ghost"
          current={source}
          onChange={setSource}
          label="Ghost export"
          description="A JSON export of a Ghost site. Posts become posts; pages become pages in the publication's navigation."
        />
        <SourceRadio
          value="offprint"
          current={source}
          onChange={setSource}
          label="Offprint publication"
          description="The at:// uri of an Offprint publication. Its posts are read straight from the author's PDS."
        />
      </div>

      {source === "ghost" ? <AdminImportGhost /> : <AdminImportOffprint />}
    </div>
  );
}

function SourceRadio(props: {
  value: Source;
  current: Source;
  onChange: (s: Source) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-baseline gap-2 text-sm cursor-pointer">
      <input
        type="radio"
        name="import-source"
        checked={props.current === props.value}
        onChange={() => props.onChange(props.value)}
      />
      <span>
        <span className="font-bold text-primary">{props.label}</span>{" "}
        <span className="text-tertiary">{props.description}</span>
      </span>
    </label>
  );
}
