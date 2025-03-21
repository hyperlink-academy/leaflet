"use client";

import { SubscribeButton } from "app/lish/Subscribe";
import { usePublicationRelationship } from "./usePublicationRelationship";
import { usePublicationContext } from "components/Providers/PublicationContext";
import { NewDraftButton } from "./NewDraftButton";
import { Menu, MenuItem } from "components/Layout";
import { ArrowRightTiny, MoreOptionsTiny, ShareSmall } from "components/Icons";

export function CallToActionButton() {
  let rel = usePublicationRelationship();
  let { publication } = usePublicationContext();
  if (!publication) return null;
  if (rel?.isAuthor) return <NewDraftButton publication={publication.uri} />;
  if (rel?.isSubscribed)
    return (
      <div className="flex gap-2">
        <div className="font-bold">You're Subscribed!</div>
        <ManageSubscriptionMenu />
      </div>
    );
  return <SubscribeButton publication={publication.uri} />;
}

const ManageSubscriptionMenu = () => {
  return (
    <Menu trigger={<MoreOptionsTiny className="rotate-90" />}>
      <MenuItem onSelect={() => {}}>Unsub!</MenuItem>
    </Menu>
  );
};
