"use client";
import { ButtonPrimary } from "components/Buttons";
import Link from "next/link";
import { useState } from "react";
import { PostList } from "./PostList";
import Publication from "./publication/page";

export const isSubscribed = false;
export const isAuthor = false;
export const isLoggedIn = false;

export const LishHome = () => {
  let [state, setState] = useState<"posts" | "subscriptions">("posts");
  return (
    <div className="w-full h-fit min-h-full p-4 bg-bg-leaflet">
      <div className="flex flex-col gap-6 justify-center  place-items-center max-w-prose w-full mx-auto">
        <div
          className="p-4 w-full rounded-md"
          style={{
            background:
              "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
          }}
        >
          <PublicationList publications={Publications} isAuthor />
        </div>

        {Publications.length === 0 && (
          <ButtonPrimary> Start a Publication </ButtonPrimary>
        )}
        <div className="homeFeed w-full flex flex-col">
          <div className="flex gap-1 justify-center">
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

const PublicationList = (props: {
  isAuthor?: boolean;
  publications: { title: string; description: string }[];
}) => {
  return (
    <div className="w-full flex flex-col gap-2">
      {props.publications.map((pub) => {
        return <PublicationListItem {...pub} isAuthor={props.isAuthor} />;
      })}
      {props.isAuthor && (
        <button className="text-sm">Start a new Publication</button>
      )}
    </div>
  );
};

const PublicationListItem = (props: {
  title: string;
  description: string;
  isAuthor?: boolean;
}) => {
  return (
    <Link
      href="./publication"
      className={`pubPostListItem flex ${!props.isAuthor && "flex-col"} hover:no-underline justify-between items-center`}
    >
      <h4 className="justify-self-start">{props.title}</h4>

      {props.isAuthor ? (
        <ButtonPrimary>Post</ButtonPrimary>
      ) : (
        <>
          <div className="text-secondary text-sm pt-1">{props.description}</div>
          <hr className="border-border-light mt-3" />{" "}
        </>
      )}
    </Link>
  );
};

const PostFeed = () => {
  return <PostList subList />;
};

let Posts = [
  {
    title: "Bluesky post blocks and Make with Leaflet",
    description:
      "This is a small but meaningful start in playing with the Bluesky / AT Protocol ecosystem.",
    date: "Mar 6, 2025",
    author: "brendan",
    pub: "Leaflet Explorers",
  },
  {
    title: "undo/redo & polls",
    description: "Unduly unruly undo — unto you!",
    date: "Feb 21, 2025",
    author: "brendan",
    pub: "Leaflet Explorers",
  },
  {
    title: "PWA support, block betterment & more",
    description: "Hi all, lots of Leaflet improvements in the past week or so!",
    date: "Feb 6, 2025",
    author: "brendan",
    pub: "Leaflet Explorers",
  },
];

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
