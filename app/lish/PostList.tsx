import Link from "next/link";
import { Separator } from "components/Layout";

export const PostList = (props: { subList?: boolean }) => {
  return (
    <div className="pubPostList flex flex-col gap-3">
      {Posts.map((post, index) => {
        return <PostListItem {...post} key={index} subList={props.subList} />;
      })}
    </div>
  );
};

const PostListItem = (props: {
  subList?: boolean;
  title: string;
  description: string;
  date: string;
  author: string;
  pub: string;
}) => {
  return (
    <div className="pubPostListItem flex flex-col">
      {props.subList && (
        <Link
          href="./lish/publication"
          className="font-bold text-tertiary hover:no-underline text-sm "
        >
          {props.pub}
        </Link>
      )}
      <Link
        href="./lish/post"
        className="pubPostListContent flex flex-col hover:no-underline hover:text-accent-contrast"
      >
        <h4>{props.title}</h4>
        <div className="text-secondary text-sm pt-1">{props.description}</div>
        <div className="flex gap-2 text-sm text-tertiary pt-4">
          <div className="">{props.date}</div>
          <Separator classname="h-4" />
          <div>{props.author}</div>
        </div>
        <hr className="border-border-light mt-3" />
      </Link>
    </div>
  );
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
