"use client";
import { publishToPublication } from "actions/publishToPublication";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { ActionButton } from "components/ActionBar/ActionButton";
import {
  PubIcon,
  PubListEmptyContent,
  PubListEmptyIllo,
} from "components/ActionBar/Publications";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { AddSmall } from "components/Icons/AddSmall";
import { LooseLeafSmall } from "components/Icons/LooseleafSmall";
import { PublishSmall } from "components/Icons/PublishSmall";
import { useIdentityData } from "components/IdentityProvider";
import { InputWithLabel } from "components/Input";
import { Menu, MenuItem } from "components/Layout";
import {
  useLeafletDomains,
  useLeafletPublicationData,
} from "components/PageSWRDataProvider";
import { Popover } from "components/Popover";
import { SpeedyLink } from "components/SpeedyLink";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import { PubLeafletPublication } from "lexicons/api";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { useIsMobile } from "src/hooks/isMobile";
import { useReplicache, useEntity } from "src/replicache";
import { Json } from "supabase/database.types";
import {
  useBlocks,
  useCanvasBlocksWithType,
} from "src/hooks/queries/useBlocks";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { YJSFragmentToString } from "components/Blocks/TextBlock/RenderYJSFragment";
import { BlueskyLogin } from "app/login/LoginForm";
import { moveLeafletToPublication } from "actions/publications/moveLeafletToPublication";
import { saveLeafletDraft } from "actions/publications/saveLeafletDraft";
import { AddTiny } from "components/Icons/AddTiny";

export const PublishButton = (props: { entityID: string }) => {
  let { data: pub } = useLeafletPublicationData();
  let params = useParams();
  let router = useRouter();

  if (!pub) return <PublishToPublicationButton entityID={props.entityID} />;
  if (!pub?.doc)
    return (
      <ActionButton
        primary
        icon={<PublishSmall className="shrink-0" />}
        label={"Publish!"}
        onClick={() => {
          router.push(`/${params.leaflet_id}/publish`);
        }}
      />
    );

  return <UpdateButton />;
};

const UpdateButton = () => {
  let [isLoading, setIsLoading] = useState(false);
  let { data: pub, mutate } = useLeafletPublicationData();
  let { permission_token, rootEntity } = useReplicache();
  let { identity } = useIdentityData();
  let toaster = useToaster();

  return (
    <ActionButton
      primary
      icon={<PublishSmall className="shrink-0" />}
      label={isLoading ? <DotLoader /> : "Update!"}
      onClick={async () => {
        if (!pub) return;
        setIsLoading(true);
        let doc = await publishToPublication({
          root_entity: rootEntity,
          publication_uri: pub.publications?.uri,
          leaflet_id: permission_token.id,
          title: pub.title,
          description: pub.description,
        });
        setIsLoading(false);
        mutate();

        // Generate URL based on whether it's in a publication or standalone
        let docUrl = pub.publications
          ? `${getPublicationURL(pub.publications)}/${doc?.rkey}`
          : `https://leaflet.pub/p/${identity?.atp_did}/${doc?.rkey}`;

        toaster({
          content: (
            <div>
              {pub.doc ? "Updated! " : "Published! "}
              <SpeedyLink href={docUrl}>link</SpeedyLink>
            </div>
          ),
          type: "success",
        });
      }}
    />
  );
};

const PublishToPublicationButton = (props: { entityID: string }) => {
  let { identity } = useIdentityData();
  let { permission_token } = useReplicache();
  let query = useSearchParams();
  console.log(query.get("publish"));
  let [open, setOpen] = useState(query.get("publish") !== null);

  let isMobile = useIsMobile();
  identity && identity.atp_did && identity.publications.length > 0;
  let [selectedPub, setSelectedPub] = useState<string | undefined>(undefined);
  let router = useRouter();
  let { title, entitiesToDelete } = useTitle(props.entityID);
  let [description, setDescription] = useState("");

  return (
    <Popover
      asChild
      open={open}
      onOpenChange={(o) => setOpen(o)}
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="sm:max-w-sm w-[1000px]"
      trigger={
        <ActionButton
          primary
          icon={<PublishSmall className="shrink-0" />}
          label={"Publish on ATP"}
        />
      }
    >
      {!identity || !identity.atp_did ? (
        <div className="-mx-2 -my-1">
          <div
            className={`bg-[var(--accent-light)] w-full rounded-md flex flex-col  text-center justify-center p-2 pb-4 text-sm`}
          >
            <div className="mx-auto pt-2 scale-90">
              <PubListEmptyIllo />
            </div>
            <div className="pt-1 font-bold">Publish on AT Proto</div>
            {
              <>
                <div className="pb-2 text-secondary text-xs">
                  Link a Bluesky account to start <br /> a publishing on AT
                  Proto
                </div>

                <BlueskyLogin
                  compact
                  redirectRoute={`/${permission_token.id}?publish`}
                />
              </>
            }
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <PostDetailsForm
            title={title}
            description={description}
            setDescription={setDescription}
          />
          <hr className="border-border-light my-3" />
          <div>
            <PubSelector
              publications={identity.publications}
              selectedPub={selectedPub}
              setSelectedPub={setSelectedPub}
            />
          </div>
          <hr className="border-border-light mt-3 mb-2" />

          <div className="flex gap-2 items-center place-self-end">
            {selectedPub && selectedPub !== "create" && (
              <SaveAsDraftButton
                selectedPub={selectedPub}
                leafletId={permission_token.id}
                metadata={{ title: title, description }}
                entitiesToDelete={entitiesToDelete}
              />
            )}
            <ButtonPrimary
              disabled={selectedPub === undefined}
              onClick={async (e) => {
                if (!selectedPub) return;
                e.preventDefault();
                if (selectedPub === "create") return;

                // For looseleaf, navigate without publication_uri
                if (selectedPub === "looseleaf") {
                  router.push(
                    `${permission_token.id}/publish?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&entitiesToDelete=${encodeURIComponent(JSON.stringify(entitiesToDelete))}`,
                  );
                } else {
                  router.push(
                    `${permission_token.id}/publish?publication_uri=${encodeURIComponent(selectedPub)}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&entitiesToDelete=${encodeURIComponent(JSON.stringify(entitiesToDelete))}`,
                  );
                }
              }}
            >
              Next{selectedPub === "create" && ": Create Pub!"}
            </ButtonPrimary>
          </div>
        </div>
      )}
    </Popover>
  );
};

const SaveAsDraftButton = (props: {
  selectedPub: string | undefined;
  leafletId: string;
  metadata: { title: string; description: string };
  entitiesToDelete: string[];
}) => {
  let { mutate } = useLeafletPublicationData();
  let { rep } = useReplicache();
  let [isLoading, setIsLoading] = useState(false);

  return (
    <ButtonTertiary
      onClick={async (e) => {
        if (!props.selectedPub) return;
        if (props.selectedPub === "create") return;
        e.preventDefault();
        setIsLoading(true);

        // Use different actions for looseleaf vs publication
        if (props.selectedPub === "looseleaf") {
          await saveLeafletDraft(
            props.leafletId,
            props.metadata,
            props.entitiesToDelete,
          );
        } else {
          await moveLeafletToPublication(
            props.leafletId,
            props.selectedPub,
            props.metadata,
            props.entitiesToDelete,
          );
        }

        await Promise.all([rep?.pull(), mutate()]);
        setIsLoading(false);
      }}
    >
      {isLoading ? <DotLoader /> : "Save as Draft"}
    </ButtonTertiary>
  );
};

const PostDetailsForm = (props: {
  title: string;
  description: string;
  setDescription: (d: string) => void;
}) => {
  return (
    <div className=" flex flex-col gap-1">
      <div className="text-sm text-tertiary">Post Details</div>
      <div className="flex flex-col gap-2">
        <InputWithLabel label="Title" value={props.title} disabled />
        <InputWithLabel
          label="Description (optional)"
          textarea
          value={props.description}
          className="h-[4lh]"
          onChange={(e) => props.setDescription(e.currentTarget.value)}
        />
      </div>
    </div>
  );
};

const PubSelector = (props: {
  selectedPub: string | undefined;
  setSelectedPub: (s: string) => void;
  publications: {
    identity_did: string;
    indexed_at: string;
    name: string;
    record: Json | null;
    uri: string;
  }[];
}) => {
  // HEY STILL TO DO
  // test out logged out, logged in but no pubs, and pubbed up flows

  return (
    <div className="flex flex-col gap-1">
      <div className="text-sm text-tertiary">Publish to…</div>
      {props.publications.length === 0 || props.publications === undefined ? (
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 menuItem">
            <LooseLeafSmall className="shrink-0" />
            <div className="flex flex-col leading-snug">
              <div className="text-secondary font-bold">
                Publish as Looseleaf
              </div>
              <div className="text-tertiary text-sm font-normal">
                Publish this as a one off doc to AT Proto
              </div>
            </div>
          </div>
          <div className="flex gap-2 px-2 py-1 ">
            <PublishSmall className="shrink-0 text-border" />
            <div className="flex flex-col leading-snug">
              <div className="text-border font-bold">
                Publish to Publication
              </div>
              <div className="text-border text-sm font-normal">
                Publish your writing to a blog on AT Proto
              </div>
              <hr className="my-2 drashed border-border-light border-dashed" />
              <div className="text-tertiary text-sm font-normal ">
                You don't have any Publications yet.{" "}
                <a target="_blank" href="/lish/createPub">
                  Create one
                </a>{" "}
                to get started!
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <PubOption
            selected={props.selectedPub === "looseleaf"}
            onSelect={() => props.setSelectedPub("looseleaf")}
          >
            <LooseLeafSmall />
            Publish as Looseleaf
          </PubOption>
          <hr className="border-border-light border-dashed " />
          {props.publications.map((p) => {
            let pubRecord = p.record as PubLeafletPublication.Record;
            return (
              <PubOption
                key={p.uri}
                selected={props.selectedPub === p.uri}
                onSelect={() => props.setSelectedPub(p.uri)}
              >
                <>
                  <PubIcon record={pubRecord} uri={p.uri} />
                  {p.name}
                </>
              </PubOption>
            );
          })}
          <div className="flex items-center px-2 py-1 text-accent-contrast gap-2">
            <AddTiny className="m-1 shrink-0" />

            <a target="_blank" href="/lish/createPub">
              Start a new Publication
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

const PubOption = (props: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) => {
  return (
    <button
      className={`flex gap-2 menuItem font-bold text-secondary ${props.selected && "bg-[var(--accent-light)]! outline! outline-offset-1! outline-accent-contrast!"}`}
      onClick={() => {
        props.onSelect();
      }}
    >
      {props.children}
    </button>
  );
};

let useTitle = (entityID: string) => {
  let rootPage = useEntity(entityID, "root/page")[0].data.value;
  let canvasBlocks = useCanvasBlocksWithType(rootPage).filter(
    (b) => b.type === "text" || b.type === "heading",
  );
  let blocks = useBlocks(rootPage).filter(
    (b) => b.type === "text" || b.type === "heading",
  );
  let firstBlock = canvasBlocks[0] || blocks[0];

  let firstBlockText = useEntity(firstBlock?.value, "block/text")?.data.value;

  const leafletTitle = useMemo(() => {
    if (!firstBlockText) return "Untitled";
    let doc = new Y.Doc();
    const update = base64.toByteArray(firstBlockText);
    Y.applyUpdate(doc, update);
    let nodes = doc.getXmlElement("prosemirror").toArray();
    return YJSFragmentToString(nodes[0]) || "Untitled";
  }, [firstBlockText]);

  // Only handle second block logic for linear documents, not canvas
  let isCanvas = canvasBlocks.length > 0;
  let secondBlock = !isCanvas ? blocks[1] : undefined;
  let secondBlockTextValue = useEntity(secondBlock?.value || null, "block/text")
    ?.data.value;
  const secondBlockText = useMemo(() => {
    if (!secondBlockTextValue) return "";
    let doc = new Y.Doc();
    const update = base64.toByteArray(secondBlockTextValue);
    Y.applyUpdate(doc, update);
    let nodes = doc.getXmlElement("prosemirror").toArray();
    return YJSFragmentToString(nodes[0]) || "";
  }, [secondBlockTextValue]);

  let entitiesToDelete = useMemo(() => {
    let etod: string[] = [];
    // Only delete first block if it's a heading type
    if (firstBlock?.type === "heading") {
      etod.push(firstBlock.value);
    }
    // Delete second block if it's empty text (only for linear documents)
    if (
      !isCanvas &&
      secondBlockText.trim() === "" &&
      secondBlock?.type === "text"
    ) {
      etod.push(secondBlock.value);
    }
    return etod;
  }, [firstBlock, secondBlockText, secondBlock, isCanvas]);

  return { title: leafletTitle, entitiesToDelete };
};
