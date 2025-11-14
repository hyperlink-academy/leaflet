import { publishToPublication } from "actions/publishToPublication";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { ActionButton } from "components/ActionBar/ActionButton";
import {
  PubIcon,
  PubListEmptyContent,
} from "components/ActionBar/Publications";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { AddSmall } from "components/Icons/AddSmall";
import { LooseLeafSmall } from "components/Icons/LooseleafSmall";
import { PublishSmall } from "components/Icons/PublishSmall";
import { useIdentityData } from "components/IdentityProvider";
import { InputWithLabel } from "components/Input";
import { Menu, MenuItem } from "components/Layout";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { Popover } from "components/Popover";
import { SpeedyLink } from "components/SpeedyLink";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import { PubLeafletPublication } from "lexicons/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useIsMobile } from "src/hooks/isMobile";
import { useReplicache, useEntity } from "src/replicache";
import { Json } from "supabase/database.types";
import { useBlocks } from "src/hooks/queries/useBlocks";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { YJSFragmentToString } from "components/Blocks/TextBlock/RenderYJSFragment";

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
  let toaster = useToaster();

  return (
    <ActionButton
      primary
      icon={<PublishSmall className="shrink-0" />}
      label={isLoading ? <DotLoader /> : "Update!"}
      onClick={async () => {
        if (!pub || !pub.publications) return;
        setIsLoading(true);
        let doc = await publishToPublication({
          root_entity: rootEntity,
          publication_uri: pub.publications.uri,
          leaflet_id: permission_token.id,
          title: pub.title,
          description: pub.description,
        });
        setIsLoading(false);
        mutate();
        toaster({
          content: (
            <div>
              {pub.doc ? "Updated! " : "Published! "}
              <SpeedyLink
                href={`${getPublicationURL(pub.publications)}/${doc?.rkey}`}
              >
                link
              </SpeedyLink>
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

  let isMobile = useIsMobile();
  identity && identity.atp_did && identity.publications.length > 0;
  let [selectedPub, setSelectedPub] = useState<string | undefined>(undefined);

  return (
    <Popover
      asChild
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
        // this component is also used on Home to populate the sidebar when PubList is empty
        // when user doesn't have an AT Proto account, and redirects back to the doc (hopefully with publish open?
        <div className="-mx-2 -my-1">
          <PubListEmptyContent compact />
        </div>
      ) : (
        <div className="flex flex-col">
          <PostDetailsForm entityID={props.entityID} />
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
            <ButtonTertiary>Save as Draft</ButtonTertiary>
            <ButtonPrimary disabled={selectedPub === undefined}>
              Next{selectedPub === "create" && ": Create Pub!"}
            </ButtonPrimary>
          </div>
        </div>
      )}
    </Popover>
  );
};

const PostDetailsForm = (props: { entityID: string }) => {
  let [description, setDescription] = useState("");

  let rootPage = useEntity(props.entityID, "root/page")[0].data.value;
  let firstBlock = useBlocks(rootPage)[0];
  let firstBlockText = useEntity(firstBlock?.value, "block/text")?.data.value;

  const leafletTitle = useMemo(() => {
    if (!firstBlockText) return "Untitled";
    let doc = new Y.Doc();
    const update = base64.toByteArray(firstBlockText);
    Y.applyUpdate(doc, update);
    let nodes = doc.getXmlElement("prosemirror").toArray();
    return YJSFragmentToString(nodes[0]) || "Untitled";
  }, [firstBlockText]);

  return (
    <div className=" flex flex-col gap-1">
      <div className="text-sm text-tertiary">Post Details</div>
      <div className="flex flex-col gap-2">
        <InputWithLabel label="Title" value={leafletTitle} disabled />
        <InputWithLabel
          label="Description (optional)"
          textarea
          value={description}
          className="h-[4lh]"
          onChange={(e) => setDescription(e.currentTarget.value)}
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
                Publish as LooseLeaf
              </div>
              <div className="text-tertiary text-sm font-normal">
                Publish this as a one off doc to AT Proto
              </div>
            </div>
          </div>
          <div className="flex gap-2 menuItem">
            <PublishSmall className="shrink-0" />
            <div className="flex flex-col leading-snug">
              <div className="text-secondary font-bold">
                Start a Publication!
              </div>
              <div className="text-tertiary text-sm font-normal">
                Publish your writing to a blog or newsletter on AT Proto
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
          <PubOption
            selected={props.selectedPub === "create"}
            onSelect={() => props.setSelectedPub("create")}
          >
            <>
              <AddSmall /> Create New Publication
            </>
          </PubOption>
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
