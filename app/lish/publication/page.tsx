"use client";
import { ButtonPrimary } from "components/Buttons";
import { MoreOptionsTiny, ShareSmall } from "components/Icons";
import { isSubscribed } from "../LishHome";
import { Menu, MenuItem } from "components/Layout";
import Link from "next/link";

export default function Publication() {
  return (
    <div className="pubPage w-full h-fit min-h-full bg-bg-leaflet">
      <div className="pubContent max-w-prose p-4 mx-auto flex flex-col gap-6 ">
        <div className="pubHeader flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2>Leaflet Explorers</h2>
            <div className="pubDescription ">
              We're making Leaflet, a fast fun web app for making delightful
              documents. Sign up to follow along as we build Leaflet! We
              typically send updates every week or two.
            </div>
          </div>
          <div className="pubSubStatus flex gap-2">
            {isSubscribed ? (
              <>
                <div>You Subscribe!</div>
                <ManageSubscriptionMenu />
              </>
            ) : (
              <>
                <SubscribeButton />
                <ShareButton />
              </>
            )}
          </div>
        </div>
        <PostList />
      </div>
    </div>
  );
}

const SubscribeButton = () => {
  return <ButtonPrimary>Subscribe</ButtonPrimary>;
};

const ShareButton = () => {
  return (
    <button className="text-accent-contrast">
      <ShareSmall />
    </button>
  );
};

const ManageSubscriptionMenu = () => {
  return (
    <Menu trigger={<MoreOptionsTiny />}>
      <MenuItem onSelect={() => {}}>Unsub!</MenuItem>
    </Menu>
  );
};

const PostList = () => {
  return (
    <div className="pubPostList flex flex-col gap-3">
      {Posts.map((post) => {
        return <PostListItem {...post} />;
      })}
    </div>
  );
};

const PostListItem = (props: {
  title: string;
  description: string;
  date: string;
  author: string;
}) => {
  return (
    <Link
      href="./post"
      className="pubPostListItem flex flex-col hover:no-underline"
    >
      <h4>{props.title}</h4>
      <div className="text-secondary text-sm italic">{props.description}</div>
      <div className="flex gap-2 text-sm text-tertiary pt-4">
        <div className="font-bold">{props.date}</div>
        <div>{props.author}</div>
      </div>
      <hr className="border-border-light mt-3" />
    </Link>
  );
};

let Posts = [
  {
    title: "Bluesky post blocks and Make with Leaflet",
    description:
      "This is a small but meaningful start in playing with the Bluesky / AT Protocol ecosystem.",
    date: "Mar 6, 2025",
    author: "brendan",
  },
  {
    title: "undo/redo & polls",
    description: "Unduly unruly undo — unto you!",
    date: "Feb 21, 2025",
    author: "brendan",
  },
  {
    title: "PWA support, block betterment & more",
    description: "Hi all, lots of Leaflet improvements in the past week or so!",
    date: "Feb 6, 2025",
    author: "brendan",
  },
];
