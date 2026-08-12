import { useLeafletDomains } from "components/PageSWRDataProvider";
import {
  ShareButton,
  useReadOnlyShareLink,
} from "app/(app)/(editor)/[leaflet_id]/actions/ShareOptions";
import { useEffect, useState } from "react";

export const PageShareMenu = (props: { entityID: string }) => {
  let publishLink = useReadOnlyShareLink();
  let { data: domains } = useLeafletDomains();
  let [collabLink, setCollabLink] = useState<null | string>(null);
  useEffect(() => {
    setCollabLink(window.location.pathname);
  }, []);

  return (
    <div>
      <ShareButton
        text="Share Edit Link"
        smokerText="Edit link copied!"
        id="get-page-collab-link"
        link={`${collabLink}?page=${props.entityID}`}
      />
      <ShareButton
        text="Share View Link"
        smokerText="View link copied!"
        id="get-page-publish-link"
        fullLink={
          domains?.[0]
            ? `https://${domains[0].domain}${domains[0].route}?page=${props.entityID}`
            : undefined
        }
        link={`${publishLink}?page=${props.entityID}`}
      />
      <hr className="my-1" />
      <div className="max-w-xs px-2  pt-1 pb-2 leading-snug text-tertiary text-sm">
        Link recipients can view this subpage and any pages it links to.
      </div>
    </div>
  );
};
