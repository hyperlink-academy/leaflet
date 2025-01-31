import { useLeafletDomains } from "components/PageSWRDataProvider";
import { ShareButton, usePublishLink } from "components/ShareOptions";
import { useEffect, useState } from "react";

export const PageShareMenu = (props: { entityID: string }) => {
  let publishLink = usePublishLink();
  let { data: domains } = useLeafletDomains();
  let [collabLink, setCollabLink] = useState<null | string>(null);
  useEffect(() => {
    setCollabLink(window.location.pathname);
  }, []);

  return (
    <div>
      <ShareButton
        text="Share Edit Link"
        subtext=""
        helptext="recipients can edit the full Leaflet"
        smokerText="Collab link copied!"
        id="get-page-collab-link"
        link={`${collabLink}?page=${props.entityID}`}
      />
      <ShareButton
        text="Share View Link"
        subtext=""
        helptext="recipients can view the full Leaflet"
        smokerText="Publish link copied!"
        id="get-page-publish-link"
        fullLink={
          domains?.[0]
            ? `https://${domains[0].domain}${domains[0].route}?page=${props.entityID}`
            : undefined
        }
        link={`${publishLink}?page=${props.entityID}`}
      />
    </div>
  );
};
