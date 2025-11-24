"use client";

import { Menu, MenuItem } from "components/Layout";
import { useState } from "react";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { useTemplateState } from "../Actions/CreateNewButton";
import { useSmoker, useToaster } from "components/Toast";
import { TemplateRemoveSmall } from "components/Icons/TemplateRemoveSmall";
import { TemplateSmall } from "components/Icons/TemplateSmall";
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
import { ShareButton } from "components/ShareOptions";
import { ShareSmall } from "components/Icons/ShareSmall";

import { PermissionToken } from "src/replicache";
import {
  useIdentityData,
  mutateIdentityData,
} from "components/IdentityProvider";
import {
  usePublicationData,
  mutatePublicationData,
} from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";

export const LeafletOptions = (props: {
  leaflet: PermissionToken;
  isTemplate?: boolean;
  draftInPublication?: string;
  document_uri?: string;
  shareLink: string;
  archived?: boolean | null;
}) => {
  let [state, setState] = useState<"normal" | "template" | "areYouSure">(
    "normal",
  );
  let [open, setOpen] = useState(false);
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
          props.document_uri ? (
            <PublishedPostOptions
              setState={setState}
              document_uri={props.document_uri}
              {...props}
            />
          ) : (
            <DefaultOptions
              isTemplate={props.isTemplate}
              setState={setState}
              {...props}
            />
          )
        ) : state === "template" ? (
          <AddTemplateForm
            leaflet={props.leaflet}
            close={() => setOpen(false)}
          />
        ) : state === "areYouSure" ? (
          <DeleteAreYouSureForm
            backToMenu={() => setState("normal")}
            leaflet={props.leaflet}
            document_uri={props.document_uri}
            draft={!!props.draftInPublication}
          />
        ) : null}
      </Menu>
    </>
  );
};

const DefaultOptions = (props: {
  setState: (s: "areYouSure" | "template") => void;
  draftInPublication?: string;
  leaflet: PermissionToken;
  isTemplate: boolean | undefined;
  shareLink: string;
  archived?: boolean | null;
}) => {
  let toaster = useToaster();
  let { mutate: mutatePub } = usePublicationData();
  let { mutate: mutateIdentity } = useIdentityData();
  return (
    <>
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
        link={`/${props.shareLink}`}
      />
      <TemplateOptions
        leaflet={props.leaflet}
        setState={props.setState}
        isTemplate={props.isTemplate}
      />

      <hr className="border-border-light" />
      <MenuItem
        onSelect={async () => {
          if (!props.archived) {
            mutateIdentityData(mutateIdentity, (data) => {
              let item = data.permission_token_on_homepage.find(
                (p) => p.permission_tokens?.id === props.leaflet.id,
              );
              if (item) item.archived = true;
            });
            mutatePublicationData(mutatePub, (data) => {
              let item = data.publication?.leaflets_in_publications.find(
                (l) => l.permission_tokens?.id === props.leaflet.id,
              );
              if (item) item.archived = true;
            });
            await archivePost(props.leaflet.id);
            toaster({
              content: (
                <div className="font-bold flex gap-2">
                  Archived{props.draftInPublication ? " Draft" : " Leaflet"}!
                  <ButtonTertiary
                    className="underline text-accent-2!"
                    onClick={async () => {
                      mutateIdentityData(mutateIdentity, (data) => {
                        let item = data.permission_token_on_homepage.find(
                          (p) => p.permission_tokens?.id === props.leaflet.id,
                        );
                        if (item) item.archived = false;
                      });
                      mutatePublicationData(mutatePub, (data) => {
                        let item = data.publication?.leaflets_in_publications.find(
                          (l) => l.permission_tokens?.id === props.leaflet.id,
                        );
                        if (item) item.archived = false;
                      });
                      await unarchivePost(props.leaflet.id);
                      toaster({
                        content: (
                          <div className="font-bold flex gap-2">
                            Unarchived!
                          </div>
                        ),
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
            mutateIdentityData(mutateIdentity, (data) => {
              let item = data.permission_token_on_homepage.find(
                (p) => p.permission_tokens?.id === props.leaflet.id,
              );
              if (item) item.archived = false;
            });
            mutatePublicationData(mutatePub, (data) => {
              let item = data.publication?.leaflets_in_publications.find(
                (l) => l.permission_tokens?.id === props.leaflet.id,
              );
              if (item) item.archived = false;
            });
            await unarchivePost(props.leaflet.id);
            toaster({
              content: <div className="font-bold">Unarchived!</div>,
              type: "success",
            });
          }
        }}
      >
        <ArchiveSmall />
        {!props.archived ? " Archive" : "Unarchive"}
        {props.draftInPublication ? " Draft" : " Leaflet"}
      </MenuItem>
      <MenuItem
        onSelect={(e) => {
          e.preventDefault();
          props.setState("areYouSure");
        }}
      >
        <DeleteSmall />
        Delete Forever
      </MenuItem>
    </>
  );
};

const PublishedPostOptions = (props: {
  setState: (s: "areYouSure") => void;
  document_uri: string;
  leaflet: PermissionToken;
  shareLink: string;
}) => {
  let toaster = useToaster();
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
        link={`/${props.shareLink}}`}
      />

      <hr className="border-border-light" />
      <MenuItem
        onSelect={async () => {
          if (props.document_uri) {
            await unpublishPost(props.document_uri);
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
      <MenuItem
        onSelect={(e) => {
          e.preventDefault();
          props.setState("areYouSure");
        }}
      >
        <DeleteSmall />
        <div className="flex flex-col">
          Delete Post
          <div className="text-tertiary text-sm font-normal!">
            Unpublish AND delete
          </div>
        </div>
      </MenuItem>
    </>
  );
};

const DeleteAreYouSureForm = (props: {
  backToMenu: () => void;
  document_uri?: string;
  leaflet: PermissionToken;
  draft?: boolean;
}) => {
  let toaster = useToaster();
  let { mutate: mutatePub } = usePublicationData();
  let { mutate: mutateIdentity } = useIdentityData();

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
            mutateIdentityData(mutateIdentity, (data) => {
              data.permission_token_on_homepage =
                data.permission_token_on_homepage.filter(
                  (p) => p.permission_tokens?.id !== props.leaflet.id,
                );
            });
            mutatePublicationData(mutatePub, (data) => {
              if (!data.publication) return;
              data.publication.leaflets_in_publications =
                data.publication.leaflets_in_publications.filter(
                  (l) => l.permission_tokens?.id !== props.leaflet.id,
                );
            });
            if (props.document_uri) {
              await deletePost(props.document_uri);
            }
            deleteLeaflet(props.leaflet);

            toaster({
              content: (
                <div className="font-bold">
                  Deleted{" "}
                  {props.document_uri
                    ? "Post!"
                    : props.draft
                      ? "Draft"
                      : "Leaflet!"}
                </div>
              ),
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

const AddTemplateForm = (props: {
  leaflet: PermissionToken;
  close: () => void;
}) => {
  let [name, setName] = useState("");
  let smoker = useSmoker();
  return (
    <div className="flex flex-col gap-2 px-3 py-1">
      <label className="font-bold flex flex-col gap-1 text-secondary">
        Template Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          type="text"
          className=" text-primary font-normal border border-border rounded-md outline-hidden px-2 py-1 w-64"
        />
      </label>

      <ButtonPrimary
        onClick={() => {
          useTemplateState.getState().addTemplate({
            name,
            id: props.leaflet.id,
          });
          let newLeafletButton = document.getElementById("new-leaflet-button");
          if (!newLeafletButton) return;
          let rect = newLeafletButton.getBoundingClientRect();
          smoker({
            static: true,
            text: <strong>Added {name}!</strong>,
            position: {
              y: rect.top,
              x: rect.right + 5,
            },
          });
          props.close();
        }}
        className="place-self-end"
      >
        Add Template
      </ButtonPrimary>
    </div>
  );
};

const TemplateOptions = (props: {
  leaflet: PermissionToken;
  isTemplate: boolean | undefined;
  setState: (s: "template") => void;
}) => {
  let smoker = useSmoker();
  if (props.isTemplate)
    return (
      <MenuItem
        onSelect={(e) => {
          useTemplateState.getState().removeTemplate(props.leaflet);
          let newLeafletButton = document.getElementById("new-leaflet-button");
          if (!newLeafletButton) return;
          let rect = newLeafletButton.getBoundingClientRect();
          smoker({
            static: true,
            text: <strong>Removed template!</strong>,
            position: {
              y: rect.top,
              x: rect.right + 5,
            },
          });
        }}
      >
        <TemplateRemoveSmall /> Remove from Templates
      </MenuItem>
    );
  return (
    <MenuItem
      onSelect={(e) => {
        e.preventDefault();
        props.setState("template");
      }}
    >
      <TemplateSmall /> Use as Template
    </MenuItem>
  );
};
