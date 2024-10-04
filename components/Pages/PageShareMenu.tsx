import { ShareButton, usePublishLink } from "components/ShareOptions";
import { useEffect, useState } from "react";

export const PageShareMenu = (props: { entityID: string }) => {
  let publishLink = usePublishLink();
  let [collabLink, setCollabLink] = useState<null | string>(null);
  useEffect(() => {
    setCollabLink(window.location.pathname);
  }, []);

  return (
    <div>
      <ShareButton
        text="Publish This Page"
        subtext="Share a read only link to this page"
        smokerText="Share link copied!"
        id="get-page-publish-link"
        link={`${publishLink}?page=${props.entityID}`}
      />
      <ShareButton
        text="Collab on This Page"
        subtext="Invite people to collab on this page together"
        smokerText="Collab link copied!"
        id="get-page-collab-link"
        link={`${collabLink}?page=${props.entityID}`}
      />
    </div>
  );
};
