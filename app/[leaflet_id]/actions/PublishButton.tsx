import { publishToPublication } from "actions/publishToPublication";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { ActionButton } from "components/ActionBar/ActionButton";
import { PublishSmall } from "components/Icons/PublishSmall";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { SpeedyLink } from "components/SpeedyLink";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import { useState } from "react";
import { useReplicache } from "src/replicache";

export const PublishButton = () => {
  let { data: pub } = useLeafletPublicationData();
  let params = useParams();
  let router = useRouter();
  if (!pub)
    return (
      <ActionButton
        primary
        icon={<PublishSmall className="shrink-0" />}
        label={"Publish on ATP"}
      />
    );
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
