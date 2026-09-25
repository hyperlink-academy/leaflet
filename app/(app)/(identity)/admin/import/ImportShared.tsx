"use client";

import React from "react";
import { Checkbox } from "components/Checkbox";

export type ImportMode = "draft" | "publish";
// Where a published post lives: under the path it had at the source, or
// under a fresh Leaflet record key.
export type PathMode = "source" | "leaflet";

// The draft/publish choice, the post URL choice, and the Discover opt-in,
// shared by every import source.
export function ImportOptions(props: {
  mode: ImportMode;
  onModeChange: (m: ImportMode) => void;
  pathMode: PathMode;
  onPathModeChange: (m: PathMode) => void;
  showInDiscover: boolean;
  onShowInDiscoverChange: (v: boolean) => void;
  publishDescription: string;
  draftDescription: string;
  sourcePathDescription: string;
  leafletPathDescription: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3>Options</h3>
      <Radio
        name="import-mode"
        value="publish"
        current={props.mode}
        onChange={props.onModeChange}
        label="Create drafts and publish"
        description={props.publishDescription}
      />
      <Radio
        name="import-mode"
        value="draft"
        current={props.mode}
        onChange={props.onModeChange}
        label="Create drafts only"
        description={props.draftDescription}
      />
      <div className="text-sm font-bold text-primary pt-2">Post URLs</div>
      <Radio
        name="import-path-mode"
        value="source"
        current={props.pathMode}
        onChange={props.onPathModeChange}
        label="Keep the source's paths"
        description={props.sourcePathDescription}
      />
      <Radio
        name="import-path-mode"
        value="leaflet"
        current={props.pathMode}
        onChange={props.onPathModeChange}
        label="Use Leaflet's format"
        description={props.leafletPathDescription}
      />
      <Checkbox
        small
        checked={props.showInDiscover}
        onChange={(e) => props.onShowInDiscoverChange(e.target.checked)}
      >
        Show published posts in Discover and aggregated feeds.
      </Checkbox>
    </div>
  );
}

function Radio<T extends string>(props: {
  name: string;
  value: T;
  current: T;
  onChange: (m: T) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-baseline gap-2 text-sm cursor-pointer">
      <input
        type="radio"
        name={props.name}
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

export function Badge(props: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span
      className={`px-1 rounded-sm border ${props.warn ? "border-accent-1 text-accent-1" : "border-border-light text-tertiary"}`}
    >
      {props.children}
    </span>
  );
}

export function SelectAllHeader(props: {
  selected: number;
  total: number;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-bg-page border-b border-border-light">
      <Checkbox
        small
        checked={props.selected === props.total}
        indeterminate={props.selected > 0}
        onChange={props.onToggle}
      >
        <span className="text-tertiary">Select all</span>
      </Checkbox>
    </div>
  );
}

export function ExternalLink(props: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="text-accent-contrast hover:underline"
      href={props.href}
      target="_blank"
      rel="noreferrer"
    >
      {props.children}
    </a>
  );
}
