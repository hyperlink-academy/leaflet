"use client";
import { ButtonPrimary } from "components/Buttons";
import { ArrowRightTiny, MoreOptionsTiny, ShareSmall } from "components/Icons";
import { isSubscribed, isAuthor } from "../../LishHome";
import { Menu, MenuItem } from "components/Layout";
import Link from "next/link";
import { Footer } from "../../Footer";
import { useEffect, useState } from "react";
import { SubscribeButton, ShareButton } from "../../Subscribe";
import { PostList } from "../../PostList";

export default function Publication() {
  return (
    <div className="pubPage w-full h-screen bg-bg-leaflet flex items-stretch">
      <div className="pubWrapper flex flex-col w-full ">
        <div className="pubContent flex flex-col gap-8 px-4 py-6 mx-auto max-w-prose h-full overflow-scroll">
          <div
            id="pub-header"
            className="pubHeader flex flex-col gap-6 justify-center text-center"
          >
            <div className="flex flex-col gap-1">
              <h2>Leaflet Explorers</h2>
              <div className="pubDescription ">
                We're making Leaflet, a fast fun web app for making delightful
                documents. Sign up to follow along as we build Leaflet! We send
                updates every week or two.
              </div>
            </div>
            <div className="pubSubStatus flex gap-2 justify-center">
              {isAuthor ? (
                <div className="flex gap-2">
                  <ButtonPrimary>Write a Draft</ButtonPrimary>
                  <ShareButton />
                </div>
              ) : isSubscribed ? (
                <>
                  <div className="font-bold">You're Subscribed!</div>
                  <ManageSubscriptionMenu />
                </>
              ) : (
                <>
                  <SubscribeButton />
                </>
              )}
            </div>
          </div>
          <PostList />
        </div>
        <Footer pageType="pub" />
      </div>
    </div>
  );
}

const ManageSubscriptionMenu = () => {
  return (
    <Menu trigger={<MoreOptionsTiny className="rotate-90" />}>
      <MenuItem onSelect={() => {}}>Unsub!</MenuItem>
    </Menu>
  );
};
