"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { mutate as globalMutate } from "swr";

import { Modal } from "components/Modal";
import { ActionButton } from "components/ActionBar/ActionButton";
import { HistorySmall } from "components/Icons/HistorySmall";
import { MoreOptionsTiny } from "components/Icons/MoreOptionsTiny";
import { Input } from "components/Input";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { EmptyState } from "components/EmptyState";
import { Menu, MenuItem } from "components/Menu";
import { useToaster } from "components/Toast";
import { useReplicache } from "src/replicache";
import { useIdentityData } from "components/IdentityProvider";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { timeAgo } from "src/utils/timeAgo";
import { addDocToHome } from "src/utils/homeDocsStorage";
import {
  getVersions,
  saveVersion,
  restoreVersion,
  forkVersionAsNewLeaflet,
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
      className="max-w-sm w-full"
      title="Version History"
      open={open}
      onOpenChange={setOpen}
      trigger={<ActionButton icon={<HistorySmall />} label="Versions" />}
    >
      <div className="flex flex-col gap-2">
        <SaveVersionForm tokenId={tokenId} flush={flush} onSaved={mutate} />
        {versions === undefined ? null : versions.length === 0 ? (
          <EmptyState container="opaque">
            <div className="font-bold">No versions yet</div>
            <div>
              Versions are saved manually — save one to snapshot this doc as it
              is now, then view or restore it anytime.
            </div>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {versions.map((v) => (
              <VersionRow
                key={v.id}
                version={v}
                tokenId={tokenId}
                flush={flush}
                onMutate={mutate}
                closeModal={() => setOpen(false)}
              />
            ))}
          </div>
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
      className="flex gap-2 items-center"
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
        className="input-with-border grow min-w-0"
        placeholder="Name this version (optional)"
        value={name}
        maxLength={120}
        onChange={(e) => setName(e.currentTarget.value)}
      />
      <ButtonPrimary type="submit" disabled={saving} className="shrink-0">
        {saving ? <DotLoader /> : "Save"}
      </ButtonPrimary>
    </form>
  );
}

function VersionRow(props: {
  version: DocumentVersionListing;
  tokenId: string;
  flush: () => Promise<unknown> | undefined;
  onMutate: () => void;
  closeModal: () => void;
}) {
  let { version } = props;
  let [confirmingRestore, setConfirmingRestore] = useState(false);
  let [busy, setBusy] = useState(false);
  let toaster = useToaster();
  let { identity } = useIdentityData();
  let date = useLocalizedDate(version.created_at, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  let restore = async () => {
    setBusy(true);
    try {
      await props.flush();
      let res = await restoreVersion(props.tokenId, version.id);
      if (!res.ok) return showError(toaster, res.error);
      props.onMutate();
      props.closeModal();
      toaster({ content: "Version restored", type: "success" });
    } finally {
      setBusy(false);
      setConfirmingRestore(false);
    }
  };

  let fork = async () => {
    setBusy(true);
    try {
      let res = await forkVersionAsNewLeaflet(props.tokenId, version.id);
      if (!res.ok) return showError(toaster, res.error);
      if (!identity) {
        addDocToHome(res.value.token);
        globalMutate("leaflets");
      }
      window.open(`/${res.value.token.id}`, "_blank");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="opaque-container px-2 py-1 flex gap-2 items-center justify-between">
      <div className="flex flex-col min-w-0">
        <div className="font-bold truncate">
          {version.name ||
            (version.kind === "pre_restore" ? "Backup before restore" : date)}
        </div>
        <div className="text-tertiary text-sm truncate" title={date}>
          {timeAgo(version.created_at)}
          {version.name || version.kind === "pre_restore" ? ` · ${date}` : ""}
        </div>
      </div>
      {confirmingRestore ? (
        <div className="flex gap-2 items-center shrink-0">
          <ButtonPrimary compact onClick={restore} disabled={busy}>
            {busy ? <DotLoader /> : "Restore"}
          </ButtonPrimary>
          <ButtonTertiary
            compact
            onClick={() => setConfirmingRestore(false)}
            disabled={busy}
          >
            Cancel
          </ButtonTertiary>
        </div>
      ) : (
        <div className="flex gap-1 items-center shrink-0">
          <Link
            href={`/${props.tokenId}/versions/${version.id}`}
            className="text-accent-contrast font-bold text-sm no-underline! px-1"
          >
            View
          </Link>
          <Menu
            align="end"
            trigger={
              <div
                className="text-tertiary hover:text-accent-contrast px-1 flex items-center"
                aria-label="Version options"
              >
                {busy ? <DotLoader /> : <MoreOptionsTiny />}
              </div>
            }
          >
            <MenuItem onSelect={() => setConfirmingRestore(true)}>
              Restore this version
            </MenuItem>
            <MenuItem onSelect={fork}>Open as new leaflet</MenuItem>
          </Menu>
        </div>
      )}
    </div>
  );
}
