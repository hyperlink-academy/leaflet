import { CloseTiny } from "components/Icons/CloseTiny";
import { setInteractionState } from "app/lish/[did]/[publication]/[rkey]/Interactions/Interactions";

import { Tag } from "components/Tags";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { Separator } from "components/Layout";

export const Tags = async (props: {
  document_uri: string;
  pageId: string | undefined;
}) => {
  return (
    <div>
      <div className="w-full flex justify-between text-secondary font-bold">
        Tags
        <button
          className="text-tertiary"
          onClick={() =>
            setInteractionState(props.document_uri, { drawerOpen: false })
          }
        >
          <CloseTiny />
        </button>
      </div>
      <div className="flex gap-1 flex-wrap pt-2">
        {TagList.map((tag, index) => (
          <Tag name={tag} key={index} onClick={() => {}} />
        ))}
      </div>
      <hr className="border-border-light my-2" />
      <div className="flex flex-col gap-2">
        {/*PLACEHOLDER FOR NOW CAUSE POSTS WERE HARD TO GET
        You should should <PostPreivew /> componenet to render the actual posts*/}
        <div>posts in publication</div>
        <DummyPost />
        <DummyPost />
        <DummyPost />
        all posts
        <DummyPost />
        <DummyPost />
        <DummyPost />
      </div>
    </div>
  );
};

const TagList = ["Hello", "these are", "some tags"];

const DummyPost = () => {
  return (
    <div
      className={`no-underline! flex flex-row gap-2 w-full relative
        bg-bg-leaflet
        border border-border-light rounded-lg
        sm:p-2 p-2 selected-outline
        hover:outline-accent-contrast hover:border-accent-contrast
        `}
    >
      <div className="h-full w-full absolute top-0 left-0" />
      <div className={`bg-bg-page  rounded-md w-full  px-[10px] pt-2 pb-2`}>
        <h3 className="text-primary truncate">Post Title Here</h3>

        <p className="text-secondary">test description</p>
        <div className="flex gap-2 justify-between items-end">
          <div className="flex flex-col-reverse md:flex-row md gap-3 md:gap-2 text-sm text-tertiary items-start justify-start pt-1 md:pt-3">
            <div className="text-accent-contrast font-bold no-underline text-sm flex gap-1 items-center md:w-fit w-full relative shrink-0">
              <div className="w-5 h-5 rounded-full bg-test" />
              Pub Name Here
            </div>
            <Separator classname="h-4 !min-h-0 md:block hidden" />
            <div className="flex flex-wrap gap-2 grow items-center shrink-0">
              celine
              <Separator classname="h-4 !min-h-0" />
              yesterday
            </div>
          </div>

          <div className={`flex gap-2 text-tertiary text-sm  items-center`}>
            <div
              className={`flex gap-1 items-center `}
              aria-label="Post quotes"
            >
              <QuoteTiny aria-hidden /> 5
            </div>

            <div
              className={`flex gap-1 items-center`}
              aria-label="Post comments"
            >
              <CommentTiny aria-hidden /> 6
            </div>

            <Separator classname="h-4 !min-h-0" />
            <button className="flex gap-1 items-center hover:font-bold relative">
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
