"use client";

import { Menu, MenuItem } from "components/Layout";
import { useState } from "react";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { useToaster } from "components/Toast";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { DeleteSmall } from "components/Icons/DeleteSmall";
import {
  archivePost,
  deleteLeaflet,
  unarchivePost,
} from "actions/deleteLeaflet";
import { ArchiveSmall } from "components/Icons/ArchiveSmall";
import { UnpublishSmall } from "components/Icons/UnpublishSmall";
import {
  deletePost,
  unpublishPost,
} from "app/lish/[did]/[publication]/dashboard/deletePost";
import { ShareSmall } from "components/Icons/ShareSmall";
import { HideSmall } from "components/Icons/HideSmall";
import { hideDoc } from "../storage";

import {
  useIdentityData,
  mutateIdentityData,
} from "components/IdentityProvider";
import {
  usePublicationData,
  mutatePublicationData,
} from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { ShareButton } from "app/[leaflet_id]/actions/ShareOptions";
import { useLeafletPublicationStatus } from "components/PageSWRDataProvider";

export const LeafletOptions = (props: {
  archived?: boolean | null;
  loggedIn?: boolean;
}) => {
  const pubStatus = useLeafletPublicationStatus();
  let [state, setState] = useState<"normal" | "areYouSure">("normal");
  let [open, setOpen] = useState(false);
  let { identity } = useIdentityData();
  let isPublicationOwner =
    !!identity?.atp_did && !!pubStatus?.documentUri?.includes(identity.atp_did);
  return (
    <>
      <Menu
        open={open}
        align="end"
        onOpenChange={(o) => {
          setOpen(o);
          setState("normal");
        }}
        trigger={
          <div
            className="text-secondary shrink-0 relative"
            onClick={(e) => {
              e.preventDefault;
              e.stopPropagation;
            }}
          >
            <MoreOptionsVerticalTiny />
          </div>
        }
      >
        {state === "normal" ? (
          !props.loggedIn ? (
            <LoggedOutOptions setState={setState} />
          ) : pubStatus?.documentUri && isPublicationOwner ? (
            <PublishedPostOptions setState={setState} />
          ) : (
            <DefaultOptions setState={setState} archived={props.archived} />
          )
        ) : state === "areYouSure" ? (
          <DeleteAreYouSureForm backToMenu={() => setState("normal")} />
        ) : null}
      </Menu>
    </>
  );
};

const DefaultOptions = (props: {
  setState: (s: "areYouSure") => void;
  archived?: boolean | null;
}) => {
  const pubStatus = useLeafletPublicationStatus();
  const toaster = useToaster();
  const { setArchived } = useArchiveMutations();
  const { identity } = useIdentityData();
  const tokenId = pubStatus?.token.id;
  const itemType = pubStatus?.draftInPublication ? "Draft" : "Leaflet";

  // Check if this is a published post/document and if user is the owner
  const isPublishedPostOwner =
    !!identity?.atp_did && !!pubStatus?.documentUri?.includes(identity.atp_did);
  const canDelete = !pubStatus?.documentUri || isPublishedPostOwner;

  return (
    <>
      <EditLinkShareButton link={pubStatus?.shareLink ?? ""} />
      <hr className="border-border-light" />
      <MenuItem
        onSelect={async () => {
          if (!tokenId) return;
          setArchived(tokenId, !props.archived);

          if (!props.archived) {
            await archivePost(tokenId);
            toaster({
              content: (
                <div className="font-bold flex gap-2">
                  Archived {itemType}!
                  <ButtonTertiary
                    className="underline text-accent-2!"
                    onClick={async () => {
                      setArchived(tokenId, false);
                      await unarchivePost(tokenId);
                      toaster({
                        content: <div className="font-bold">Unarchived!</div>,
                        type: "success",
                      });
                    }}
                  >
                    Undo?
                  </ButtonTertiary>
                </div>
              ),
              type: "success",
            });
          } else {
            await unarchivePost(tokenId);
            toaster({
              content: <div className="font-bold">Unarchived!</div>,
              type: "success",
            });
          }
        }}
      >
        <ArchiveSmall />
        {!props.archived ? " Archive" : "Unarchive"} {itemType}
      </MenuItem>
      {canDelete && (
        <DeleteForeverMenuItem
          onSelect={(e) => {
            e.preventDefault();
            props.setState("areYouSure");
          }}
        />
      )}
    </>
  );
};

const LoggedOutOptions = (props: { setState: (s: "areYouSure") => void }) => {
  const pubStatus = useLeafletPublicationStatus();
  const toaster = useToaster();

  return (
    <>
      <EditLinkShareButton link={`/${pubStatus?.shareLink ?? ""}`} />
      <hr className="border-border-light" />
      <MenuItem
        onSelect={() => {
          if (pubStatus?.token) hideDoc(pubStatus.token);
          toaster({
            content: <div className="font-bold">Removed from Home!</div>,
            type: "success",
          });
        }}
      >
        <HideSmall />
        Remove from Home
      </MenuItem>
      <DeleteForeverMenuItem
        onSelect={(e) => {
          e.preventDefault();
          props.setState("areYouSure");
        }}
      />
    </>
  );
};

const PublishedPostOptions = (props: {
  setState: (s: "areYouSure") => void;
}) => {
  const pubStatus = useLeafletPublicationStatus();
  const toaster = useToaster();
  const postLink = pubStatus?.postShareLink ?? "";
  const isFullUrl = postLink.includes("http");

  return (
    <>
      <ShareButton
        text={
          <div className="flex gap-2">
            <ShareSmall />
            Copy Post Link
          </div>
        }
        smokerText="Link copied!"
        id="get-link"
        link={postLink}
        fullLink={isFullUrl ? postLink : undefined}
      />
      <hr className="border-border-light" />
      <MenuItem
        onSelect={async () => {
          if (pubStatus?.documentUri) {
            await unpublishPost(pubStatus.documentUri);
          }
          toaster({
            content: <div className="font-bold">Unpublished Post!</div>,
            type: "success",
          });
        }}
      >
        <UnpublishSmall />
        <div className="flex flex-col">
          Unpublish Post
          <div className="text-tertiary text-sm font-normal!">
            Move this post back into drafts
          </div>
        </div>
      </MenuItem>
      <DeleteForeverMenuItem
        onSelect={(e) => {
          e.preventDefault();
          props.setState("areYouSure");
        }}
        subtext="Post"
      />
    </>
  );
};

const DeleteAreYouSureForm = (props: { backToMenu: () => void }) => {
  const pubStatus = useLeafletPublicationStatus();
  const toaster = useToaster();
  const { removeFromLists } = useArchiveMutations();
  const tokenId = pubStatus?.token.id;

  const itemType = pubStatus?.documentUri
    ? "Post"
    : pubStatus?.draftInPublication
      ? "Draft"
      : "Leaflet";

  return (
    <div className="flex flex-col justify-center p-2 text-center">
      <div className="text-primary font-bold"> Are you sure?</div>
      <div className="text-sm text-secondary">
        This will delete it forever for everyone!
      </div>
      <div className="flex gap-2 mx-auto items-center mt-2">
        <ButtonTertiary onClick={() => props.backToMenu()}>
          Nevermind
        </ButtonTertiary>
        <ButtonPrimary
          onClick={async () => {
            if (tokenId) removeFromLists(tokenId);
            if (pubStatus?.documentUri) {
              await deletePost(pubStatus.documentUri);
            }
            if (pubStatus?.token) deleteLeaflet(pubStatus.token);

            toaster({
              content: <div className="font-bold">Deleted {itemType}!</div>,
              type: "success",
            });
          }}
        >
          Delete it!
        </ButtonPrimary>
      </div>
    </div>
  );
};

// Shared menu items
const EditLinkShareButton = (props: { link: string }) => (
  <ShareButton
    text={
      <div className="flex gap-2">
        <ShareSmall />
        Copy Edit Link
      </div>
    }
    subtext=""
    smokerText="Link copied!"
    id="get-link"
    link={props.link}
  />
);

const DeleteForeverMenuItem = (props: {
  onSelect: (e: Event) => void;
  subtext?: string;
}) => (
  <MenuItem onSelect={props.onSelect}>
    <DeleteSmall />
    {props.subtext ? (
      <div className="flex flex-col">
        Delete {props.subtext}
        <div className="text-tertiary text-sm font-normal!">
          Unpublish AND delete
        </div>
      </div>
    ) : (
      "Delete Forever"
    )}
  </MenuItem>
);

// Helper to update archived state in both identity and publication data
function useArchiveMutations() {
  const { mutate: mutatePub } = usePublicationData();
  const { mutate: mutateIdentity } = useIdentityData();

  return {
    setArchived: (tokenId: string, archived: boolean) => {
      mutateIdentityData(mutateIdentity, (data) => {
        const item = data.permission_token_on_homepage.find(
          (p) => p.permission_tokens?.id === tokenId,
        );
        if (item) item.archived = archived;
      });
      mutatePublicationData(mutatePub, (data) => {
        const item = data.publication?.leaflets_in_publications.find(
          (l) => l.permission_tokens?.id === tokenId,
        );
        if (item) item.archived = archived;
      });
    },
    removeFromLists: (tokenId: string) => {
      mutateIdentityData(mutateIdentity, (data) => {
        data.permission_token_on_homepage =
          data.permission_token_on_homepage.filter(
            (p) => p.permission_tokens?.id !== tokenId,
          );
      });
      mutatePublicationData(mutatePub, (data) => {
        if (!data.publication) return;
        data.publication.leaflets_in_publications =
          data.publication.leaflets_in_publications.filter(
            (l) => l.permission_tokens?.id !== tokenId,
          );
      });
    },
  };
}
