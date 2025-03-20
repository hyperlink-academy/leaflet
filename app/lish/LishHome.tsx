"use client";
import { ButtonPrimary } from "components/Buttons";
import Link from "next/link";
import { useState } from "react";
import { PostList } from "./PostList";
import Publication from "./publication/page";

export const isSubscribed = false;
export const isAuthor = false;
export const isBskyConnected = true;

export const LishHome = () => {
  let [state, setState] = useState<"posts" | "subscriptions">("posts");
  return (
    <div className="w-full h-fit min-h-full p-4 bg-bg-leaflet">
      <div className="flex flex-col gap-6 justify-center  place-items-center max-w-prose w-full mx-auto">
        <div
          className="p-4 rounded-md w-full"
          style={{
            backgroundColor:
              "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
          }}
        >
          <MyPublicationList />
        </div>
        {Publications.length === 0 && (
          <ButtonPrimary> Start a Publication </ButtonPrimary>
        )}
        <div className="homeFeed w-full flex flex-col">
          <div className="flex gap-1 justify-center pb-2">
            <Tab
              name="updates"
              active={state === "posts"}
              onClick={() => setState("posts")}
            />
            <Tab
              name="subscriptions"
              active={state === "subscriptions"}
              onClick={() => setState("subscriptions")}
            />
          </div>
          <hr className="border-border w-full mb-2" />
          {state === "posts" ? (
            <PostFeed />
          ) : (
            <PublicationList publications={Subscriptions} isAuthor={false} />
          )}
        </div>
      </div>
    </div>
  );
};

const Tab = (props: { name: string; active: boolean; onClick: () => void }) => {
  return (
    <div
      className={`border-border px-2 py-1 ${props.active ? "font-bold" : ""}`}
      onClick={props.onClick}
    >
      {props.name}
    </div>
  );
};

const MyPublicationList = () => {
  if (!isBskyConnected) {
    return (
      <div className="flex flex-col justify-center text-center place-items-center">
        <div className="font-bold text-center">
          Connect to Bluesky <br className="sm:hidden" />
          to start publishing!
        </div>
        <small className="text-tertiary text-center pt-1">
          We use the ATProtocol to store all your publication data on the open
          web. That means we cannot lock you into our platform, you will ALWAYS
          be free to easily move elsewhere. <a>Learn More.</a>
        </small>
        <ButtonPrimary className="mt-4"> Connect to Bluesky </ButtonPrimary>
      </div>
    );
  }
  if (Publications.length === 0) {
    return (
      <div>
        <Link href={"./lish/createPub"}>
          <ButtonPrimary>Start a Publication!</ButtonPrimary>
        </Link>
      </div>
    );
  }
  return (
    <div className="w-full flex flex-col gap-2">
      <PublicationList publications={Publications} isAuthor={true} />
      {/* <hr className="border-border" /> */}
      <Link
        href={"./lish/createPub"}
        className="text-sm place-self-start text-tertiary hover:text-accent-contrast"
      >
        New Publication
      </Link>
    </div>
  );
};

const PublicationList = (props: {
  isAuthor?: boolean;
  publications: { title: string; description: string }[];
}) => {
  return (
    <div className="w-full flex flex-col gap-2">
      {props.publications.map((pub) => {
        if (props.isAuthor) {
          return <PublicationListItem {...pub} />;
        }
        return <SubscriptionListItem {...pub} />;
      })}
    </div>
  );
};

const SubscriptionListItem = (props: {
  title: string;
  description: string;
}) => {
  return (
    <Link
      href="./lish/publication"
      className={`pubPostListItem flex flex-col hover:no-underline justify-between items-center`}
    >
      <h4 className="justify-self-start">{props.title}</h4>

      <div className="text-secondary text-sm pt-1">{props.description}</div>
      <hr className="border-border-light mt-3" />
    </Link>
  );
};
const PublicationListItem = (props: { title: string; description: string }) => {
  return (
    <div
      className={`pubPostListItem flex hover:no-underline justify-between items-center`}
    >
      <Link href="./lish/publication">
        <h4 className="justify-self-start">{props.title}</h4>
      </Link>

      <ButtonPrimary>Post</ButtonPrimary>
    </div>
  );
};

const PostFeed = () => {
  return <PostList subList />;
};

let Subscriptions = [
  {
    title: "vrk loves paper",
    description:
      "Exploring software that loves paper as much as I do. I'll be documenting my learnings, loves, confusions and creations in this newsletter!",
  },
  {
    title: "rhrizome r&d",
    description:
      "Design, research, and complexity. A field guide for novel problems.",
  },
  {
    title: "Dead Languages Society ",
    description:
      "A guided tour through the history of English and its relatives.",
  },
];

let Publications = [
  {
    title: "Leaflet Explorers",
    description:
      "We're making Leaflet, a fast fun web app for making delightful documents. Sign up to follow along as we build Leaflet! We send updates every week or two",
  },
];
