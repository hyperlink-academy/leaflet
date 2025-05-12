"use client";

import { SubscribeButton } from "app/lish/Subscribe";
import { usePublicationRelationship } from "./usePublicationRelationship";
import { usePublicationContext } from "components/Providers/PublicationContext";
import { NewDraftButton } from "./NewDraftButton";
import { Menu, MenuItem } from "components/Layout";
import { useIdentityData } from "components/IdentityProvider";
import { unsubscribeFromPublication } from "actions/unsubscribeFromPublication";
import { MoreOptionsTiny } from "components/Icons/MoreOptionsTiny";

export function CallToActionButton() {
  let rel = usePublicationRelationship();
  let { publication } = usePublicationContext();
  if (!publication) return null;
  if (rel?.isAuthor) return <NewDraftButton publication={publication.uri} />;
  if (rel?.isSubscribed)
    return (
      <div className="flex gap-2">
        <div className="font-bold">You're Subscribed!</div>
        <ManageSubscriptionMenu publication_uri={publication.uri} />
      </div>
    );
  return <SubscribeButton publication={publication.uri} />;
}

const ManageSubscriptionMenu = (props: { publication_uri: string }) => {
  let { mutate } = useIdentityData();
  return (
    <Menu trigger={<MoreOptionsTiny className="rotate-90" />}>
      <MenuItem
        onSelect={async () => {
          await unsubscribeFromPublication(props.publication_uri);
          mutate();
        }}
      >
        Unsub!
      </MenuItem>
    </Menu>
  );
};
