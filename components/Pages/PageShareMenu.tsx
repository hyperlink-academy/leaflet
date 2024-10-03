import { MenuItem } from "components/Layout";
import { ShareButton } from "components/ShareOptions";

export const PageShareMenu = (props: { entityID: string }) => {
  return (
    <div>
      <ShareButton
        text="Publish This Page"
        subtext="Share a read only version of just this page"
        smokerText="Share link copied!"
        id="get-page-publish-link"
        link=""
      />
      <ShareButton
        text="Collab on This Page"
        subtext="Invite people to edit just this page together"
        smokerText="Collab link copied!"
        id="get-page-collab-link"
        link=""
      />
    </div>
  );
};
