import { publishToPublication } from "actions/publishToPublication";
import {
  getBasePublicationURL,
  getPublicationURL,
} from "app/lish/createPub/getPublicationURL";
import { ActionButton } from "components/ActionBar/ActionButton";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { PublishSmall } from "components/Icons/PublishSmall";
import { useIdentityData } from "components/IdentityProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import router from "next/router";
import { useState } from "react";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useReplicache, useEntity } from "src/replicache";
import { Json } from "supabase/database.types";

export const BackToPubButton = (props: {
  publication: {
    identity_did: string;
    indexed_at: string;
    name: string;
    record: Json;
    uri: string;
  };
}) => {
  return (
    <Link
      href={`${getBasePublicationURL(props.publication)}/dashboard`}
      className="hover:!no-underline"
    >
      <ActionButton
        icon={<GoBackSmall className="shrink-0" />}
        label="To Pub"
      />
    </Link>
  );
};

export const PublishButton = () => {
  let { data: pub } = useLeafletPublicationData();
  let params = useParams();
  let router = useRouter();
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
              <Link
                href={`${getPublicationURL(pub.publications)}/${doc?.rkey}`}
              >
                link
              </Link>
            </div>
          ),
          type: "success",
        });
      }}
    />
  );
};
