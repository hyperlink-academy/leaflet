import { publishToPublication } from "actions/publishToPublication";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { ActionButton } from "components/ActionBar/ActionButton";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { PublishSmall } from "components/Icons/PublishSmall";
import { useIdentityData } from "components/IdentityProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useToaster } from "components/Toast";
import { publications } from "drizzle/schema";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity, useReplicache } from "src/replicache";
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
  let { identity } = useIdentityData();

  let handle = identity?.resolved_did?.alsoKnownAs?.[0].slice(5)!;
  let name = props.publication.name;
  return (
    <Link
      href={`${getPublicationURL(props.publication)}/dashboard`}
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
  let { data, mutate } = useLeafletPublicationData();
  let identity = useIdentityData();
  let { permission_token, rootEntity } = useReplicache();
  let rootPage = useEntity(rootEntity, "root/page")[0];
  let blocks = useBlocks(rootPage?.data.value);
  let toaster = useToaster();
  let pub = data[0];
  return (
    <ActionButton
      primary
      icon={<PublishSmall className="shrink-0" />}
      label={pub.doc ? "Update!" : "Publish!"}
      onClick={async () => {
        if (!pub || !pub.publications) return;
        let doc = await publishToPublication({
          root_entity: rootEntity,
          blocks,
          publication_uri: pub.publications.uri,
          leaflet_id: permission_token.id,
          title: pub.title,
          description: pub.description,
        });
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
