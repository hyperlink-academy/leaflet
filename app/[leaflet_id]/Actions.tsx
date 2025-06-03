import { getBasePublicationURL } from "app/lish/createPub/getPublicationURL";
import { ActionButton } from "components/ActionBar/ActionButton";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { PublishSmall } from "components/Icons/PublishSmall";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  let router = useRouter();
  let params = useParams();

  return (
    <ActionButton
      primary
      icon={<PublishSmall className="shrink-0" />}
      label={pub?.doc ? "Update!" : "Publish!"}
      onClick={() => {
        router.push(`/${params.leaflet_id}/publish`);
      }}
    />
  );
};
