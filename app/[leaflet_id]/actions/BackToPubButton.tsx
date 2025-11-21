import { getBasePublicationURL } from "app/lish/createPub/getPublicationURL";
import { ActionButton } from "components/ActionBar/ActionButton";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { SpeedyLink } from "components/SpeedyLink";
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
    <SpeedyLink
      href={`${getBasePublicationURL(props.publication)}/dashboard`}
      className="hover:no-underline!"
    >
      <ActionButton
        icon={<GoBackSmall className="shrink-0" />}
        label="To Pub"
      />
    </SpeedyLink>
  );
};
