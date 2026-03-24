import { ManageSubscription } from "app/lish/Subscribe";
import { ButtonPrimary } from "components/Buttons";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { GoToArrow } from "components/Icons/GoToArrow";
import { Input } from "components/Input";
import { Modal } from "components/Modal";
import { Popover } from "components/Popover";
import { SubscribeButton } from "components/Subscribe/SubscribeButton";
import Link from "next/link";
import { useState } from "react";

export const PostPubInfo = () => {
  let newsletterMode = false;
  let user = {
    loggedIn: false,
    email: "thisiscelinepark@gmail.com",
    handle: "celine",
    subscribed: false,
  };
  return (
    <div className="px-3 sm:px-4 w-full">
      <div className="accent-container rounded-lg! w-full px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5 text-center justify-center">
        <h3 className="leading-snug text-secondary">Pub Title here</h3>
        <div className="text-tertiary pb-3">this is the pubs description</div>
        {user.subscribed ? (
          <div>Manage Sub</div>
        ) : (
          <SubscribeButton newsletterMode={newsletterMode} user={user} />
        )}
      </div>
    </div>
  );
};
