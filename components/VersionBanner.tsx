"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate as globalMutate } from "swr";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { Menu, MenuItem } from "components/Menu";
import { Modal } from "components/Modal";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { useIdentityData } from "components/IdentityProvider";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { addDocToHome } from "src/utils/homeDocsStorage";
import { restoreVersion, forkVersionAsNewLeaflet } from "actions/versions";
import {
  useIsVersion,
  type SavedVersion,
} from "components/SavedVersionContext";
import { Separator } from "./Layout";
import { GoToArrowLined } from "./Icons/GoToArrowLined";

export function InlineVersionBanner() {
  return (
    <SavedVersionBanner
      className="
     inlineVersionBanner accent-container px-2 py-1 sm:mx-2 mx-1  mt-2 mb-0"
    />
  );
}

export function FloatingVersionBanner() {
  return (
    <SavedVersionBanner className="floatingVersionBanner accent-container fixed top-2 left-1/2 -translate-x-1/2 z-20 opaque-container rounded-md px-2 py-1 shadow-md max-w-[calc(100vw-16px)]" />
  );
}

function SavedVersionBanner({ className }: { className: string }) {
  let version = useIsVersion();
  if (!version) return null;
  return (
    <div className={className}>
      <SavedVersionBannerContent version={version} />
    </div>
  );
}

function SavedVersionBannerContent({ version }: { version: SavedVersion }) {
  let sameYear =
    new Date(version.savedAt).getFullYear() === new Date().getFullYear();
  let date = useLocalizedDate(version.savedAt, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return (
    <div className="flex sm:flex-row flex-col items-start justify-between gap-x-4 gap-y-1 text-sm w-full">
      <div className=" flex sm:flex-row flex-col sm:gap-3 text-tertiary truncate w-full">
        <div className="sm:w-fit w-full flex justify-between">
          <div className="font-bold">VIEW ONLY</div>
          <div className="sm:hidden">
            <VersionActions version={version} />
          </div>
        </div>
        <div className="flex gap-1 grow min-w-0">
          <div className="min-w-0 truncate">
            {version.name ? `${version.name}` : "Saved Version"}{" "}
          </div>
          <div>·</div>
          {date}
        </div>
      </div>
      <div className="sm:block hidden">
        <VersionActions version={version} />
      </div>
    </div>
  );
}

function VersionActions({ version }: { version: SavedVersion }) {
  return (
    <div className="flex gap-2 items-center shrink-0">
      <Link
        href={`/${version.tokenId}`}
        className="text-sm text-accent-contrast font-bold flex gap-1 items-center no-underline!"
      >
        <GoToArrowLined className="rotate-180" /> Back
      </Link>
      {version.canModify && (
        <>
          <Separator classname="h-4!" />
          <VersionOptions version={version} />
        </>
      )}
    </div>
  );
}

function VersionOptions({ version }: { version: SavedVersion }) {
  let [confirming, setConfirming] = useState<"restore" | "fork" | null>(null);
  let [busy, setBusy] = useState(false);
  let toaster = useToaster();
  let { identity } = useIdentityData();
  let router = useRouter();

  let restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let res = await restoreVersion(version.tokenId, version.versionId);
      if (!res.ok) return toaster({ content: res.error, type: "error" });
      setConfirming(null);
      toaster({ content: "Version restored", type: "success" });
      router.push(`/${version.tokenId}`);
    } finally {
      setBusy(false);
    }
  };

  let fork = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let res = await forkVersionAsNewLeaflet(
        version.tokenId,
        version.versionId,
      );
      if (!res.ok) return toaster({ content: res.error, type: "error" });
      if (!identity) {
        addDocToHome(res.value.token);
        globalMutate("leaflets");
      }
      setConfirming(null);
      window.open(`/${res.value.token.id}`, "_blank");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Menu
        align="end"
        trigger={
          <div
            className="font-bold text-accent-contrast flex items-center"
            aria-label="Version options"
          >
            Options
          </div>
        }
      >
        <MenuItem
          onSelect={() => setConfirming("restore")}
          className="justify-end py-0.5!"
        >
          Restore this version
        </MenuItem>
        <MenuItem
          onSelect={() => setConfirming("fork")}
          className="justify-end py-0.5!"
        >
          Create new from version
        </MenuItem>
      </Menu>

      <ConfirmModal
        open={confirming === "restore"}
        onClose={() => setConfirming(null)}
        title="Restore?"
        confirmLabel="Restore"
        busy={busy}
        onConfirm={restore}
      >
        <div className="font-bold">
          This will replace the current doc
          <br /> with this version.
        </div>
        The current doc will also be saved as a version, so you can get it back!
      </ConfirmModal>

      <ConfirmModal
        open={confirming === "fork"}
        onClose={() => setConfirming(null)}
        title="Create a new document?"
        confirmLabel="Create new"
        busy={busy}
        onConfirm={fork}
      >
        <div>
          This will copy this version into a new doc and open it in a new tab.
        </div>
        The current doc will be left as is.
      </ConfirmModal>
    </>
  );
}

function ConfirmModal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      open={props.open}
      onOpenChange={(o) => {
        if (!o && !props.busy) props.onClose();
      }}
      title={props.title}
      className="max-w-full w-sm text-center"
    >
      <div className="flex flex-col gap-2 text-center text-secondary leading-snug">
        <div className="flex flex-col gap-1">{props.children}</div>
        <div className="flex gap-3 pt-2 justify-center">
          <ButtonTertiary
            type="button"
            onClick={props.onClose}
            disabled={props.busy}
          >
            Nevermind
          </ButtonTertiary>
          <ButtonPrimary
            type="button"
            onClick={props.onConfirm}
            disabled={props.busy}
          >
            {props.busy ? <DotLoader /> : props.confirmLabel}
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
  );
}
