"use client";

import { useState } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Modal } from "components/Modal";
import { Menu, MenuItem } from "components/Menu";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { DeleteSmall } from "components/Icons/DeleteSmall";
import { DotLoader } from "components/utils/DotLoader";
import { Avatar } from "components/Avatar";
import { useSmoker, useToaster } from "components/Toast";
import { HandleSearchInput } from "components/HandleSearchInput";
import type { ActorSuggestion } from "src/hooks/useActorTypeahead";
import { useContributorProfiles } from "src/hooks/useContributorProfiles";
import { useIdentityData } from "components/IdentityProvider";
import {
  usePublicationData,
  mutatePublicationData,
} from "../PublicationSWRProvider";
import type { Profile } from "src/identity";
import { SettingsSection } from "components/SettingsLayout";
import {
  inviteContributor,
  removeContributor,
  type ContributorActionError,
} from "actions/publications/contributors";
import { getBasePublicationURL } from "src/utils/getPublicationURL";

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
  // Set on a successful invite, which opens the success modal. `actor` is only
  // present when the handle was picked from the typeahead; otherwise the modal
  // falls back to the profile fetched for the new DID.
  let [invited, setInvited] = useState<{
    did: string;
    handle: string;
    actor?: ActorSuggestion;
  } | null>(null);

  let handleInvite = async (
    handle: string,
    actor?: ActorSuggestion,
  ): Promise<boolean> => {
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
    setInvited({
      did: added.contributor_did,
      handle: handle.trim().replace(/^@/, ""),
      actor,
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
    <>
      <SettingsSection title="Invite Contributors ">
        <div className="leading-snug text-secondary">
          Contributors can write and publish to this publication!<br /> Posts they publish with have thier name in the byline but are still owned by you.
           <br />
        </div>
        <div className="leading-snug text-secondary">
          Search Atmosphere accounts to add contributors.
        </div>

        <div className="mt-2">
          <HandleSearchInput
            leading={null}
            placeholder="handle.bsky.social"
            triggerClassName="max-w-md w-full"
            loading={adding}
            onSubmit={handleInvite}
            renderAction={(submit, value) => (
              <ButtonSecondary
                compact
                className="text-sm"
                type="button"
                disabled={!value || adding}
                onClick={(e) => {
                  e.stopPropagation();
                  submit();
                }}
              >
                {adding ? <DotLoader /> : "Invite"}
              </ButtonSecondary>
            )}
          />
        </div>
      </SettingsSection>

      <InviteSuccessModal
        invited={invited}
        profile={invited ? profiles?.[invited.did] ?? null : null}
        onClose={() => setInvited(null)}
        acceptLink={props.acceptLink}
      />

      <SettingsSection title="Contributors">
        <ContributorList
          rows={contributors}
          loading={loading}
          onRemove={handleRemove}
          acceptLink={props.acceptLink}
        />
      </SettingsSection>
    </>
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
}) {
  let copyInviteLink = useCopyInviteLink(props.acceptLink);

  if (props.loading)
    return (
      <div className="text-tertiary text-sm py-2">
        <DotLoader />
      </div>
    );
  if (props.rows.length === 0)
    return (
      <div className="text-tertiary italic py-2">no contributors yet…</div>
    );
  return (
    <>
      {props.rows.some((row) => !row.confirmed) && (
        <div className="text-tertiary leading-snug">
          Pending contributors haven't accepted their invite yet. <br />
          Send them an invite link so they can accept and start writing!
        </div>
      )}
      <div className="contributors flex flex-col gap-2">
        {props.rows.map((row) => (
          <div
            key={row.contributor_did}
            className="contributor flex items-start gap-2 border border-border-light rounded-md px-2 py-1.5"
          >
            <div className="contributorContent flex md:flex-row md:justify-between flex-col grow">
              <div className="contributorInfo flex gap-2 items-start">
                <Avatar
                  src={row.profile?.avatar ?? undefined}
                  displayName={
                    row.profile?.displayName ?? row.profile?.handle ?? undefined
                  }
                  size="medium"
                />
                <div className="flex flex-col min-w-0 grow">
                  <div className="truncate font-bold text-primary leading-tight ">
                    {row.profile?.displayName ||
                      row.profile?.handle ||
                      row.contributor_did}
                  </div>
                  {row.profile?.handle && (
                    <div className="truncate text-tertiary text-sm italic">
                      @{row.profile.handle}
                    </div>
                  )}
                </div>
              </div>

              {row.confirmed ? null : (
                <div className="contributorStatus text-sm text-tertiary mt-1 shrink-0 md:mr-0 ml-8">
                  Pending -{" "}
                  <button
                    className="text-accent-contrast text-sm underline"
                    type="button"
                    onClick={copyInviteLink}
                  >
                    Get invite link
                  </button>
                </div>
              )}
            </div>

            <Menu
              align="end"
              trigger={
                <div className="text-secondary shrink-0 pt-0.5">
                  <MoreOptionsVerticalTiny />
                </div>
              }
            >
              <MenuItem onSelect={() => props.onRemove(row.contributor_did)}>
                <DeleteSmall />
                Remove Contributor
              </MenuItem>
            </Menu>
          </div>
        ))}
      </div>
    </>
  );
}

// Copies the invite link and smokes the confirmation from the button that was
// clicked, so the feedback stays next to the action.
function useCopyInviteLink(acceptLink: string) {
  let smoker = useSmoker();
  return async (e: React.MouseEvent) => {
    let rect = e.currentTarget.getBoundingClientRect();
    let position = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height + 2,
    };
    let url = new URL(acceptLink, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      smoker({ position, text: "Copied invite link!" });
    } catch {
      smoker({ position, error: true, text: "Couldn't copy link!" });
    }
  };
}

function InviteSuccessModal(props: {
  invited: { did: string; handle: string; actor?: ActorSuggestion } | null;
  profile: Profile | null;
  onClose: () => void;
  acceptLink: string;
}) {
  let copyInviteLink = useCopyInviteLink(props.acceptLink);
  let { invited } = props;

  let handle =
    invited?.actor?.handle ?? props.profile?.handle ?? invited?.handle;
  let displayName =
    invited?.actor?.displayName ?? props.profile?.displayName ?? handle;
  let avatar = invited?.actor?.avatar ?? props.profile?.avatar ?? undefined;

  return (
    <Modal
      open={!!invited}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title="Added a new Contributor!"
      className="max-w-sm"
    >
      <div className="flex flex-col gap-3">
        <div className="text-secondary leading-snug">
          You invited{" "}
          {/* align-middle sits half an x-height above the baseline, which reads
              a touch low next to cap-height text; the 1px lift centers it. */}
          <Avatar
            ariaHidden
            src={avatar}
            displayName={displayName}
            size="small"
            className="inline-flex align-middle relative -top-px"
          />
          <strong className="text-primary">{displayName}</strong> as a
          contributor!
        </div>
        <div className="text-secondary leading-snug">
          Send them this invite link so they can start writing.
        </div>
        <div className="accent-container flex flex-col gap-3 p-3">
          <ButtonPrimary fullWidth type="button" onClick={copyInviteLink}>
            Copy Invite Link
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
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
    <SettingsSection title="Contributor" className="pb-4">
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
    </SettingsSection>
  );
}
