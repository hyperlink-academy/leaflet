import { ActionButton } from "components/ActionBar/ActionButton";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { PublishSmall } from "components/Icons/PublishSmall";
import { useIdentityData } from "components/IdentityProvider";
import { publications } from "drizzle/schema";
import Link from "next/link";
export const BackToPubButton = (props: {
  publication: {
    identity_did: string;
    indexed_at: string;
    name: string;
    uri: string;
  };
}) => {
  let { identity } = useIdentityData();

  let handle = identity?.resolved_did?.alsoKnownAs?.[0].slice(5)!;
  let name = props.publication.name;
  return (
    <Link href={`/lish/${handle}/${name}/`} className="hover:!no-underline">
      <ActionButton
        icon={<GoBackSmall className="shrink-0" />}
        label="To Pub"
      />
    </Link>
  );
};

export const PublishButton = () => {
  return (
    <ActionButton
      primary
      icon={<PublishSmall className="shrink-0" />}
      label="Publish!"
    />
  );
};
