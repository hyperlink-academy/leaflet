"use client";

import { useState } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Input } from "components/Input";
import { Combobox, ComboboxResult } from "components/Combobox";
import { Modal } from "components/Modal";
import { DotLoader } from "components/utils/DotLoader";
import { Avatar } from "components/Avatar";
import { useToaster } from "components/Toast";
import { useActorTypeahead } from "src/hooks/useActorTypeahead";
import { useContributorProfiles } from "src/hooks/useContributorProfiles";
import { useIsPro } from "src/hooks/useEntitlement";
import { useIdentityData } from "components/IdentityProvider";
import {
  usePublicationData,
  mutatePublicationData,
} from "../PublicationSWRProvider";
import type { Profile } from "src/identity";
import { DashboardContainer } from "./SettingsContent";
import {
  inviteContributor,
  removeContributor,
  type ContributorActionError,
} from "actions/publications/contributors";
import { UpgradeToProButton } from "../../UpgradeModal";
import { getBasePublicationURL } from "app/(published)/lish/createPub/getPublicationURL";

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
  let publication = pubData?.publication;
  let publicationUri = publication?.uri;
  let ownerDid = publication?.identity_did;
  let isOwner = !!identity?.atp_did && identity.atp_did === ownerDid;
  let isPro = useIsPro();

  if (!publicationUri || !publication || !identity) return null;

  // The accept-invitation page lives at the publication's base path.
  let acceptLink =
    getBasePublicationURL({
      uri: publication.uri,
      record: publication.record,
    }) + "/contributor_accept";

  return isOwner ? (
    <OwnerContributorSettings
      publicationUri={publicationUri}
      isPro={isPro}
      acceptLink={acceptLink}
    />
  ) : (
    <ContributorLeaveSettings
      publicationUri={publicationUri}
      myDid={identity?.atp_did}
    />
  );
}

function OwnerContributorSettings(props: {
  publicationUri: string;
  isPro: boolean;
  acceptLink: string;
}) {
  let toaster = useToaster();
  let { data: pubData, mutate } = usePublicationData();

  // The contributor rows already arrive with the publication data, so we read
  // them straight from that cache instead of re-querying the table.
  let rows = pubData?.publication?.publication_contributors ?? [];
  let dids = rows.map((r) => r.contributor_did);

  // Profiles (handle/displayName/avatar) are fetched asynchronously and merged
  // in. The hook keys on the DID set so it refetches when contributors are
  // added or removed.
  let { data: profiles } = useContributorProfiles(dids);

  let contributors = rows.map((r) => ({
    contributor_did: r.contributor_did,
    confirmed: !!r.confirmed,
    profile: profiles?.[r.contributor_did] ?? null,
  }));
  // Rows are present immediately; only the async profile fetch can be pending.
  let loading = dids.length > 0 && !profiles;

  let [adding, setAdding] = useState(false);

  let handleInvite = async (handle: string): Promise<boolean> => {
    if (adding) return false;
    setAdding(true);

    let res = await inviteContributor(props.publicationUri, handle);
    setAdding(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return false;
    }
    let added = res.value;
    // Add the row to the publication cache; the profiles SWR key changes with
    // the new DID and fetches its profile.
    mutatePublicationData(mutate, (draft) => {
      let list = draft.publication?.publication_contributors;
      if (
        list &&
        !list.some((c) => c.contributor_did === added.contributor_did)
      )
        list.push({
          contributor_did: added.contributor_did,
          confirmed: added.confirmed,
          created_at: added.created_at,
        });
    });
    toaster({
      type: "success",
      content: `Invited @${handle.trim().replace(/^@/, "")}`,
    });
    return true;
  };

  let handleRemove = async (contributor_did: string) => {
    mutatePublicationData(mutate, (draft) => {
      let list = draft.publication?.publication_contributors;
      if (!list) return;
      let idx = list.findIndex((c) => c.contributor_did === contributor_did);
      if (idx >= 0) list.splice(idx, 1);
    });
    let res = await removeContributor(props.publicationUri, contributor_did);
    if (!res.ok) {
      // Restore the optimistic removal by revalidating from the server.
      mutate();
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
        rows={contributors}
        loading={loading}
        onRemove={handleRemove}
        acceptLink={props.acceptLink}
        emptyMessage="No contributors yet."
      />
    </DashboardContainer>
  );
}

function ContributorList(props: {
  rows: {
    contributor_did: string;
    confirmed: boolean;
    profile: Profile | null;
  }[];
  loading: boolean;
  onRemove: (did: string) => void;
  acceptLink: string;
  emptyMessage: string;
}) {
  let toaster = useToaster();
  let copyInviteLink = async () => {
    let url = new URL(props.acceptLink, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      toaster({ type: "success", content: "Link copied" });
    } catch {
      toaster({ type: "error", content: "Couldn't copy link" });
    }
  };

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
            src={row.profile?.avatar ?? undefined}
            displayName={
              row.profile?.displayName ?? row.profile?.handle ?? undefined
            }
            size="medium"
          />
          <div className="flex flex-col min-w-0 grow">
            <div className="truncate font-bold text-primary text-sm">
              {row.profile?.displayName ||
                row.profile?.handle ||
                row.contributor_did}
            </div>
            {row.profile?.handle && (
              <div className="truncate text-tertiary text-xs italic">
                @{row.profile.handle}
              </div>
            )}
          </div>
          <div className="text-xs text-tertiary mr-2">
            {row.confirmed ? "Active" : "Invited"}
          </div>
          {!row.confirmed && (
            <ButtonSecondary compact type="button" onClick={copyInviteLink}>
              Copy invite link
            </ButtonSecondary>
          )}
          <ButtonSecondary
            compact
            onClick={() => props.onRemove(row.contributor_did)}
          >
            Remove
          </ButtonSecondary>
        </div>
      ))}
    </div>
  );
}

function InviteHandleInput(props: {
  onInvite: (handle: string) => Promise<boolean>;
  loading?: boolean;
}) {
  let {
    handleValue,
    setHandleValue,
    suggestions,
    setSuggestions,
    dropdownOpen,
    setDropdownOpen,
    highlighted,
    setHighlighted,
  } = useActorTypeahead({
    debounceMs: 250,
    transformQuery: (v) => v.trim().replace(/^@/, ""),
  });

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
      triggerClassName="w-full"
      className="w-(--radix-popover-trigger-width)!"
      trigger={
        <div className="input-with-border relative py-0! flex items-center gap-2 w-full">
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

function ContributorLeaveSettings(props: {
  publicationUri: string;
  myDid: string | null | undefined;
}) {
  let toaster = useToaster();
  let [leaving, setLeaving] = useState(false);
  let [open, setOpen] = useState(false);

  let handleLeave = async () => {
    if (leaving || !props.myDid) return;
    setLeaving(true);
    // Leaving == removing yourself; removeContributor permits self-removal.
    let res = await removeContributor(props.publicationUri, props.myDid);
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
