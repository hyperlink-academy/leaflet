"use client";

import React from "react";
import { Checkbox } from "components/Checkbox";

export type ImportMode = "draft" | "publish";

// The draft/publish choice and the Discover opt-in, shared by every import
// source.
export function ImportOptions(props: {
  mode: ImportMode;
  onModeChange: (m: ImportMode) => void;
  showInDiscover: boolean;
  onShowInDiscoverChange: (v: boolean) => void;
  publishDescription: string;
  draftDescription: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3>Options</h3>
      <ModeRadio
        value="publish"
        current={props.mode}
        onChange={props.onModeChange}
        label="Create drafts and publish"
        description={props.publishDescription}
      />
      <ModeRadio
        value="draft"
        current={props.mode}
        onChange={props.onModeChange}
        label="Create drafts only"
        description={props.draftDescription}
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

function ModeRadio(props: {
  value: ImportMode;
  current: ImportMode;
  onChange: (m: ImportMode) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-baseline gap-2 text-sm cursor-pointer">
      <input
        type="radio"
        name="import-mode"
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
