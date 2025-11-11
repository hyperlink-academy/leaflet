import { publishToPublication } from "actions/publishToPublication";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { ActionButton } from "components/ActionBar/ActionButton";
import {
  PubIcon,
  PubListEmptyContent,
} from "components/ActionBar/Publications";
import { ArchiveSmall } from "components/Icons/ArchiveSmall";
import { PublishSmall } from "components/Icons/PublishSmall";
import { useIdentityData } from "components/IdentityProvider";
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

  if (!hasPubs)
    return (
      <Menu
        asChild
        side={isMobile ? "top" : "right"}
        align={isMobile ? "center" : "start"}
        className="flex flex-col max-w-xs text-secondary"
        trigger={
          <ActionButton
            primary
            icon={<PublishSmall className="shrink-0" />}
            label={"Publish on ATP"}
          />
        }
      >
        <div className="text-sm text-tertiary">Publish to…</div>
        {identity?.publications?.map((d) => {
          return (
            <MenuItem
              onSelect={async () => {
                // TODO
                // make this a draft of the selected Publication
                // redirect to the publication publish page
              }}
            >
              <PubIcon
                record={d.record as PubLeafletPublication.Record}
                uri={d.uri}
              />
              <div className=" w-full truncate font-bold">{d.name}</div>
            </MenuItem>
          );
        })}
        <hr className="border-border-light my-1" />
        <MenuItem
          onSelect={() => {
            // TODO
            // send to one-off /publish page
          }}
        >
          <ArchiveSmall />
          <div className="font-bold pb-1">Publish as One-Off</div>
        </MenuItem>
      </Menu>
    );
  else
    return (
      <Popover
        asChild
        side={isMobile ? "top" : "right"}
        align={isMobile ? "center" : "start"}
        className="p-1!"
        trigger={
          <ActionButton
            primary
            icon={<PublishSmall className="shrink-0" />}
            label={"Publish on ATP"}
          />
        }
      >
        {/* this component is also used on Home to populate the sidebar when PubList is empty */}
        {/* however, this component needs to redirect to sign in, pub creation, AND publish so we might need to just make a new component */}

        <PubListEmptyContent />
      </Popover>
    );
};
