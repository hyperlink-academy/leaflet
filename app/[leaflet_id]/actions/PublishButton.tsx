import { publishToPublication } from "actions/publishToPublication";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { ActionButton } from "components/ActionBar/ActionButton";
import {
  PubIcon,
  PubListEmptyContent,
} from "components/ActionBar/Publications";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { AddSmall } from "components/Icons/AddSmall";
import { LooseLeafSmall } from "components/Icons/ArchiveSmall";
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
import { useState } from "react";
import { useIsMobile } from "src/hooks/isMobile";
import { useReplicache } from "src/replicache";
import { Json } from "supabase/database.types";

export const PublishButton = () => {
  let { data: pub } = useLeafletPublicationData();
  let params = useParams();
  let router = useRouter();

  if (!pub) return <PublishToPublication />;
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

const PublishToPublication = () => {
  let { identity } = useIdentityData();
  let params = useParams();
  let router = useRouter();
  let isMobile = useIsMobile();
  let hasPubs =
    identity && identity.atp_did && identity.publications.length > 0;

  return (
    <Popover
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="max-w-xs w-[1000px]"
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
          <PostDetailsForm />
          <hr className="border-border-light my-3" />
          <div>
            <PubSelector publications={identity.publications} />
          </div>
          <hr className="border-border-light mt-3 mb-2" />

          <div className="flex gap-2 items-center place-self-end">
            <ButtonTertiary>Save as Draft</ButtonTertiary>
            <ButtonPrimary>Next</ButtonPrimary>
          </div>
        </div>
      )}
    </Popover>
  );
};

const PostDetailsForm = () => {
  let [description, setDescription] = useState("");

  return (
    <div className=" flex flex-col gap-1">
      <div className="text-sm text-tertiary">Post Details</div>
      <div className="flex flex-col gap-2">
        <InputWithLabel label="Title" value={"Title goes here"} disabled />
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
  publications: {
    identity_did: string;
    indexed_at: string;
    name: string;
    record: Json | null;
    uri: string;
  }[];
}) => {
  // HEY STILL TO DO
  // copy over the menuItem styles and apply them if the option has been selected
  // test out logged out, logged in but no pubs, and pubbed up flows

  let [selectedPub, setSelectedPub] = useState<string | undefined>(undefined);
  return (
    <div className="flex flex-col gap-1">
      <div className="text-sm text-tertiary">Publish to…</div>
      {props.publications.length === 0 || props.publications === undefined ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 menuItem">
            <LooseLeafSmall className="shrink-0" />
            <div className="flex flex-col leading-snug">
              <div className="text-secondary font-bold">
                Publish as LooseLeaf
              </div>
              <div className="text-tertiary text-sm">
                Publish this as a one off doc <br />
                to AT Proto
              </div>
            </div>
          </div>
          <div className="flex gap-2 menuItem">
            <PublishSmall className="shrink-0" />
            <div className="flex flex-col leading-snug">
              <div className="text-secondary font-bold">
                Start a Publication!
              </div>
              <div className="text-tertiary text-sm">
                Publish your writing to a blog or newsletter on AT Proto
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <PubOption
            selected={selectedPub === "looseleaf"}
            onSelect={() => setSelectedPub("looseleaf")}
          >
            <LooseLeafSmall />
            Publish as Looseleaf
          </PubOption>
          <hr className="border-border-light border-dashed " />
          {props.publications.map((p) => {
            let pubRecord = p.record as PubLeafletPublication.Record;
            return (
              <PubOption
                selected={selectedPub === p.uri}
                onSelect={() => setSelectedPub(p.uri)}
              >
                <>
                  <PubIcon record={pubRecord} uri={p.uri} />
                  {p.name}
                </>
              </PubOption>
            );
          })}
          <PubOption
            selected={selectedPub === "create"}
            onSelect={() => setSelectedPub("create")}
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
      className={`flex gap-2 menuItem font-bold text-secondary ${props.selected && "bg-test"}`}
      onClick={() => {
        props.onSelect();
      }}
    >
      {props.children}
    </button>
  );
};
