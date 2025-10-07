"use client";
import { ShareSmall } from "components/Icons/ShareSmall";
import { Separator } from "components/Layout";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import Link from "next/link";

export const ReaderContent = (props: { root_entity: string }) => {
  let cardBorderHidden = useCardBorderHidden(props.root_entity);
  return (
    <div className="flex flex-col gap-3">
      {dummyPosts.map((p) => (
        <Post {...p} cardBorderHidden={true} />
      ))}
    </div>
  );
};

const Post = (props: {
  title: string;
  description: string;
  date: string;
  read: boolean;
  author: string;
  pub: string;
  cardBorderHidden: boolean;
}) => {
  return (
    <div
      className={`flex flex-col gap-0 ${props.cardBorderHidden ? "bg-bg-page" : "bg-bg-leaflet"} p-3 rounded-lg border border-border-light`}
    >
      <div
        className={`${props.cardBorderHidden ? "bg-transparent" : "bg-bg-page px-3 py-2"}  rounded-md`}
      >
        <div className="flex justify-between gap-2">
          <Link
            href={"/"}
            className="text-accent-contrast font-bold no-underline text-sm "
          >
            {props.pub}
          </Link>
          <button className="text-tertiary">{/*<ShareSmall />*/}</button>
        </div>
        <h3 className="truncate">{props.title}</h3>

        <p className="text-secondary">{props.description}</p>
        <div className="flex gap-2 text-sm text-tertiary items-center pt-3">
          <div className="flex gap-[6px] items-center">
            <div className="bg-test rounded-full h-4 w-4" />
            {props.author}
          </div>
          <Separator classname="h-4 !min-h-0" />
          {props.date}
        </div>
      </div>
    </div>
  );
};

let dummyPosts: {
  title: string;
  description: string;
  date: string;
  read: boolean;
  author: string;
  pub: string;
}[] = [
  {
    title: "First Post",
    description: "this is a description",
    date: "Oct 2",
    read: false,
    author: "jared",
    pub: "a warm space",
  },
  {
    title: "This is a second Tost",
    description: "It has another description, as you can see",
    date: "Oct 2",
    read: false,
    author: "celine",
    pub: "Celine's Super Soliloquy",
  },
  {
    title: "A Third Post, A Burnt Toast",
    description:
      "If the first post is bread, the second is toast, and inevitably the third is a plate of charcoal.",
    date: "Oct 2",
    read: false,
    author: "brendan",
    pub: "Scraps",
  },
];
