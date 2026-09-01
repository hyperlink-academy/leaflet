"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";

import { Modal } from "components/Modal";
import { ActionButton } from "components/ActionBar/ActionButton";
import { HistorySmall } from "components/Icons/HistorySmall";
import { Input } from "components/Input";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { EmptyState } from "components/EmptyState";
import { useToaster } from "components/Toast";
import { useReplicache } from "src/replicache";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { timeAgo } from "src/utils/timeAgo";
import {
  getVersions,
  saveVersion,
  type DocumentVersionListing,
} from "actions/versions";

function showError(toaster: ReturnType<typeof useToaster>, error: string) {
  toaster({ content: error, type: "error" });
}

export function VersionHistory() {
  let { permission_token, rep } = useReplicache();
  let [open, setOpen] = useState(false);
  let tokenId = permission_token.id;
  let flush = () => rep?.push();
  let { data: versions, mutate } = useSWR(
    open ? `versions-${tokenId}` : null,
    async () => {
      let res = await getVersions(tokenId);
      return res.ok ? res.value : [];
    },
  );

  return (
    <Modal
      asChild
      sheetOnMobile
      className="sm:w-[1000px] max-w-md w-full"
      open={open}
      onOpenChange={setOpen}
      trigger={<ActionButton icon={<HistorySmall />} label="Versions" />}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0 leading-snug">
          <h3>Version History</h3>
          <div className="text-sm text-tertiary">
            Select a version to view it
          </div>
        </div>
        <SaveVersionForm tokenId={tokenId} flush={flush} onSaved={mutate} />
        {versions === undefined ? null : versions.length === 0 ? (
          <EmptyState container="light">
            <div className="font-bold">No versions yet…</div>
            <div>
              Once you've saved a version of this document, you can view and
              restore versions here.
            </div>
          </EmptyState>
        ) : (
          <>
            <div className="flex flex-col gap-0.5">
              {versions.map((v) => (
                <>
                  <VersionRow key={v.id} version={v} tokenId={tokenId} />
                  <hr className="last:hidden" />
                </>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function SaveVersionForm(props: {
  tokenId: string;
  flush: () => Promise<unknown> | undefined;
  onSaved: () => void;
}) {
  let [name, setName] = useState("");
  let [saving, setSaving] = useState(false);
  let toaster = useToaster();

  return (
    <form
      className="flex flex-col gap-2 items-center light-container p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
          await props.flush();
          let res = await saveVersion(props.tokenId, name);
          if (!res.ok) return showError(toaster, res.error);
          if (res.value.unchanged) {
            toaster({
              content: "No changes since the last version",
              type: "info",
            });
            return;
          }
          setName("");
          props.onSaved();
        } finally {
          setSaving(false);
        }
      }}
    >
      <Input
        autoFocus
        className="input-with-border grow min-w-0 w-full"
        placeholder="Version name (optional)"
        value={name}
        maxLength={120}
        onChange={(e) => setName(e.currentTarget.value)}
      />
      <ButtonPrimary
        type="submit"
        disabled={saving}
        fullWidth
        className="shrink-0"
        compact
      >
        {saving ? <DotLoader /> : "Save Version"}
      </ButtonPrimary>
    </form>
  );
}

function VersionRow(props: {
  version: DocumentVersionListing;
  tokenId: string;
}) {
  let { version } = props;
  let date = useLocalizedDate(version.created_at, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
  let withinLastDay =
    Date.now() - new Date(version.created_at).getTime() < 24 * 60 * 60 * 1000;

  return (
    <Link
      href={`/${props.tokenId}/versions/${version.id}`}
      className="no-underline! "
    >
      <div className=" menuItem px-3! flex flex-col gap-0! leading-snug min-w-0">
        <div className="font-bold truncate">
          {version.name ||
            (version.kind === "pre_restore" ? "Backup before restore" : date)}
        </div>
        <div
          className="text-tertiary font-normal italic text-sm truncate"
          title={date}
        >
          {withinLastDay ? timeAgo(version.created_at) : date}
        </div>
      </div>
    </Link>
  );
}
