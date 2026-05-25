"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { Agent } from "@atproto/api";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Input } from "components/Input";
import { Combobox, ComboboxResult } from "components/Combobox";
import { Modal } from "components/Modal";
import { DotLoader } from "components/utils/DotLoader";
import { Avatar } from "components/Avatar";
import { useToaster } from "components/Toast";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { useIsPro } from "src/hooks/useEntitlement";
import { useIdentityData } from "components/IdentityProvider";
import {
  usePublicationData,
} from "../PublicationSWRProvider";
import { DashboardContainer } from "./SettingsContent";
import {
  inviteContributor,
  listContributors,
  removeContributor,
  type ContributorActionError,
  type ContributorRow,
} from "actions/publications/contributors";
import { leavePublication } from "actions/publications/contributors";
import { UpgradeToProButton } from "../../UpgradeModal";

type ActorSuggestion = {
  handle: string;
  did: string;
  displayName?: string;
  avatar?: string;
};

const ERROR_MESSAGES: Record<ContributorActionError, string> = {
  unauthorized: "You're not signed in.",
  not_owner: "Only the publication owner can do this.",
  not_pro: "Inviting contributors requires Leaflet Pro.",
  invalid_handle: "We couldn't find that Bluesky handle.",
  self_invite: "You can't invite yourself.",
  already_contributor: "That account is already a contributor.",
  not_invited: "You haven't been invited.",
  database_error: "Something went wrong. Please try again.",
};

export function ContributorSettings() {
  let { data: pubData } = usePublicationData();
  let { identity } = useIdentityData();
  let publicationUri = pubData?.publication?.uri;
  let ownerDid = pubData?.publication?.identity_did;
  let isOwner = !!identity?.atp_did && identity.atp_did === ownerDid;
  let isPro = useIsPro();

  if (!publicationUri) return null;

  return isOwner ? (
    <OwnerContributorSettings publicationUri={publicationUri} isPro={isPro} />
  ) : (
    <ContributorLeaveSettings publicationUri={publicationUri} />
  );
}

function OwnerContributorSettings(props: {
  publicationUri: string;
  isPro: boolean;
}) {
  let toaster = useToaster();
  let { data, mutate, isLoading } = useSWR(
    `publication-contributors-${props.publicationUri}`,
    async () => {
      let res = await listContributors(props.publicationUri);
      if (!res.ok) return [];
      return res.value;
    },
  );

  let [adding, setAdding] = useState(false);

  let handleInvite = async (handle: string): Promise<boolean> => {
    if (adding) return false;
    setAdding(true);
    // Optimistic placeholder
    let placeholder: ContributorRow = {
      contributor_did: `pending:${handle}`,
      confirmed: false,
      created_at: new Date().toISOString(),
      handle,
      display_name: null,
      avatar: null,
    };
    let current = data ?? [];
    mutate([...current, placeholder], { revalidate: false });

    let res = await inviteContributor(props.publicationUri, handle);
    setAdding(false);
    if (!res.ok) {
      mutate(current, { revalidate: false });
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return false;
    }
    mutate(
      [...current, res.value],
      { revalidate: false },
    );
    toaster({
      type: "success",
      content: `Invited @${res.value.handle ?? "contributor"}`,
    });
    return true;
  };

  let handleRemove = async (contributor_did: string) => {
    let current = data ?? [];
    mutate(
      current.filter((c) => c.contributor_did !== contributor_did),
      { revalidate: false },
    );
    let res = await removeContributor(props.publicationUri, contributor_did);
    if (!res.ok) {
      mutate(current, { revalidate: false });
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
    }
  };

  return (
    <DashboardContainer section="Contributors" className="pb-4">
      <div className="leading-snug text-secondary">
        Invite others to write and publish to this publication. Posts are
        published from your PDS.
      </div>

      {!props.isPro ? (
        <div className="flex flex-col gap-2 mt-2">
          <div className="text-tertiary text-sm leading-snug">
            Inviting contributors requires Leaflet Pro.
          </div>
          <UpgradeToProButton />
        </div>
      ) : (
        <div className="mt-2">
          <InviteHandleInput onInvite={handleInvite} loading={adding} />
        </div>
      )}

      <ContributorList
        rows={data ?? []}
        loading={isLoading}
        onRemove={handleRemove}
        emptyMessage="No contributors yet."
      />
    </DashboardContainer>
  );
}

function ContributorList(props: {
  rows: ContributorRow[];
  loading: boolean;
  onRemove?: (did: string) => void;
  emptyMessage: string;
}) {
  if (props.loading)
    return (
      <div className="text-tertiary text-sm py-2">
        <DotLoader />
      </div>
    );
  if (props.rows.length === 0)
    return (
      <div className="text-tertiary text-sm py-2">{props.emptyMessage}</div>
    );
  return (
    <div className="flex flex-col gap-2">
      {props.rows.map((row) => (
        <div
          key={row.contributor_did}
          className="flex items-center gap-2 border border-border-light rounded-md px-2 py-1.5"
        >
          <Avatar
            src={row.avatar ?? undefined}
            displayName={row.display_name ?? row.handle ?? undefined}
            size="medium"
          />
          <div className="flex flex-col min-w-0 grow">
            <div className="truncate font-bold text-primary text-sm">
              {row.display_name || row.handle || row.contributor_did}
            </div>
            {row.handle && (
              <div className="truncate text-tertiary text-xs italic">
                @{row.handle}
              </div>
            )}
          </div>
          <div className="text-xs text-tertiary mr-2">
            {row.confirmed ? "Active" : "Invited"}
          </div>
          {props.onRemove && (
            <ButtonSecondary
              compact
              onClick={() => props.onRemove?.(row.contributor_did)}
            >
              Remove
            </ButtonSecondary>
          )}
        </div>
      ))}
    </div>
  );
}

function InviteHandleInput(props: {
  onInvite: (handle: string) => Promise<boolean>;
  loading?: boolean;
}) {
  let [handleValue, setHandleValue] = useState("");
  let [suggestions, setSuggestions] = useState<ActorSuggestion[]>([]);
  let [dropdownOpen, setDropdownOpen] = useState(false);
  let [highlighted, setHighlighted] = useState<string | undefined>(undefined);
  let requestIdRef = useRef(0);

  useDebouncedEffect(
    async () => {
      let query = handleValue.trim().replace(/^@/, "");
      if (!query) {
        setSuggestions([]);
        setDropdownOpen(false);
        return;
      }
      const requestId = ++requestIdRef.current;
      const agent = new Agent("https://public.api.bsky.app");
      try {
        const result = await agent.searchActorsTypeahead({
          q: query,
          limit: 8,
        });
        if (requestId !== requestIdRef.current) return;
        const actors = result.data.actors.map((actor) => ({
          handle: actor.handle,
          did: actor.did,
          displayName: actor.displayName,
          avatar: actor.avatar,
        }));
        setSuggestions(actors);
        setDropdownOpen(actors.length > 0);
      } catch {
        setSuggestions([]);
        setDropdownOpen(false);
      }
    },
    250,
    [handleValue],
  );

  let trySubmit = async (handle?: string) => {
    let value = (handle ?? handleValue).trim();
    if (!value || props.loading) return;
    let ok = await props.onInvite(value);
    if (ok) {
      setHandleValue("");
      setSuggestions([]);
      setDropdownOpen(false);
    }
  };

  let handles = suggestions.map((s) => s.handle);

  return (
    <Combobox
      open={dropdownOpen && !props.loading}
      onOpenChange={(open) => {
        if (!open) {
          setDropdownOpen(false);
          setHighlighted(undefined);
        }
      }}
      results={handles}
      highlighted={highlighted}
      setHighlighted={setHighlighted}
      onSelect={() => trySubmit(highlighted)}
      zIndex={60}
      sideOffset={4}
      className="w-(--radix-popover-trigger-width)!"
      trigger={
        <div className="input-with-border relative py-0! flex items-center gap-2 w-full max-w-prose">
          <Input
            className="appearance-none! grow outline-none! min-w-0 py-1!"
            placeholder="handle.bsky.social"
            value={handleValue}
            onChange={(e) => setHandleValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            autoComplete="off"
            disabled={props.loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !dropdownOpen) {
                e.preventDefault();
                trySubmit();
              }
            }}
          />
          <ButtonSecondary
            compact
            type="button"
            disabled={!handleValue || props.loading}
            onClick={(e) => {
              e.stopPropagation();
              trySubmit();
            }}
          >
            {props.loading ? <DotLoader /> : "Invite"}
          </ButtonSecondary>
        </div>
      }
    >
      {suggestions.map((actor) => (
        <ComboboxResult
          key={actor.did}
          result={actor.handle}
          highlighted={highlighted}
          setHighlighted={setHighlighted}
          onSelect={() => trySubmit(actor.handle)}
          className=" flex-row! gap-2! leading-snug text-sm"
        >
          <Avatar
            src={actor.avatar}
            displayName={actor.displayName || actor.handle}
            size="medium"
            className="mr-2"
          />
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <div className="truncate font-bold">
              {actor.displayName || actor.handle}
            </div>
            {actor.displayName && (
              <div className="text-tertiary text-xs italic truncate">
                @{actor.handle}
              </div>
            )}
          </div>
        </ComboboxResult>
      ))}
    </Combobox>
  );
}

function ContributorLeaveSettings(props: { publicationUri: string }) {
  let toaster = useToaster();
  let [leaving, setLeaving] = useState(false);
  let [open, setOpen] = useState(false);

  let handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    let res = await leavePublication(props.publicationUri);
    setLeaving(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    toaster({ type: "success", content: "You left the publication." });
    setOpen(false);
    if (typeof window !== "undefined") window.location.href = "/home";
  };

  return (
    <DashboardContainer section="Contributor" className="pb-4">
      <div className="text-secondary leading-snug">
        You're a contributor on this publication.
      </div>
      <Modal
        open={open}
        onOpenChange={setOpen}
        asChild
        title="Leave publication?"
        trigger={
          <ButtonPrimary className="self-start mt-1">
            Leave Publication
          </ButtonPrimary>
        }
      >
        <div className="text-secondary flex flex-col gap-2">
          <p>
            You'll lose access to all drafts in this publication and will no
            longer be able to publish on its behalf.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <ButtonSecondary
              type="button"
              onClick={() => setOpen(false)}
              disabled={leaving}
            >
              Cancel
            </ButtonSecondary>
            <ButtonPrimary
              type="button"
              onClick={handleLeave}
              disabled={leaving}
            >
              {leaving ? <DotLoader /> : "Leave"}
            </ButtonPrimary>
          </div>
        </div>
      </Modal>
    </DashboardContainer>
  );
}

