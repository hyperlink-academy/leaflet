"use client";
import { createContext, useContext } from "react";
import Link from "next/link";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";

type SavedVersion = {
  name: string | null;
  savedAt: string;
  currentLeafletHref: string;
};

export const SavedVersionContext = createContext<SavedVersion | null>(null);
export const useSavedVersion = () => useContext(SavedVersionContext);

export function InlineVersionBanner() {
  return (
    <SavedVersionBanner className="inlineVersionBanner w-full px-3 sm:px-4 sm:pt-3 pt-2 pb-2" />
  );
}

export function FloatingVersionBanner() {
  return (
    <SavedVersionBanner className="fixed top-2 left-1/2 -translate-x-1/2 z-20 opaque-container rounded-md px-2 py-1 shadow-md max-w-[calc(100vw-16px)]" />
  );
}

function SavedVersionBanner({ className }: { className: string }) {
  let version = useSavedVersion();
  if (!version) return null;
  return (
    <div className={className}>
      <SavedVersionBannerContent version={version} />
    </div>
  );
}

function SavedVersionBannerContent({ version }: { version: SavedVersion }) {
  let date = useLocalizedDate(version.savedAt, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-bold text-tertiary px-1 h-[20px] text-sm flex place-items-center bg-border-light rounded-md shrink-0">
          VERSION
        </span>
        <span className="text-sm text-tertiary truncate">
          {version.name ? `${version.name} · ${date}` : date}
        </span>
      </div>
      <Link
        href={version.currentLeafletHref}
        className="text-sm text-accent-contrast font-bold flex gap-1 items-center no-underline! shrink-0"
      >
        <GoBackSmall /> Back to current
      </Link>
    </div>
  );
}
