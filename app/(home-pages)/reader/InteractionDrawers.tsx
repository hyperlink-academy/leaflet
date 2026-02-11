"use client";
import { ButtonPrimary } from "components/Buttons";
import {
  SelectedPostListing,
  useSelectedPostListing,
} from "src/useSelectedPostState";
import { CommentsDrawerContent } from "app/lish/[did]/[publication]/[rkey]/Interactions/Comments";
import { CloseTiny } from "components/Icons/CloseTiny";
import { SpeedyLink } from "components/SpeedyLink";
import { GoToArrow } from "components/Icons/GoToArrow";

export const MobileInteractionPreviewDrawer = () => {
  let selectedPost = useSelectedPostListing((s) => s.selectedPostListing);

  return (
    <div
      className={`z-20 fixed bottom-0 left-0 right-0 border border-border-light shrink-0 w-screen h-[90vh] px-3 bg-bg-leaflet rounded-t-lg overflow-auto ${selectedPost === null ? "hidden" : "block md:hidden "}`}
    >
      <PreviewDrawerContent selectedPost={selectedPost} />
    </div>
  );
};

export const DesktopInteractionPreviewDrawer = () => {
  let selectedPost = useSelectedPostListing((s) => s.selectedPostListing);

  return (
    <div
      className={`hidden md:block border border-border-light shrink-0 w-96 mr-2 px-3  h-[calc(100vh-100px)] sticky top-11 bottom-4 right-0 rounded-lg overflow-auto ${selectedPost === null ? "shadow-none border-dashed bg-transparent" : "shadow-md border-border bg-bg-page "}`}
    >
      <PreviewDrawerContent selectedPost={selectedPost} />
    </div>
  );
};

const PreviewDrawerContent = (props: {
  selectedPost: SelectedPostListing | null;
}) => {
  if (!props.selectedPost || !props.selectedPost.document) return;

  if (props.selectedPost.drawer === "quotes") {
    return (
      <>
        {/*<MentionsDrawerContent
            did={selectedPost.document_uri}
            quotesAndMentions={[]}
          />*/}
      </>
    );
  } else
    return (
      <>
        <div className="w-full  text-sm text-tertiary flex justify-between pt-3 gap-3">
          <div className="truncate min-w-0 grow">
            Comments for {props.selectedPost.document.title}
          </div>
          <button
            className="text-tertiary"
            onClick={() =>
              useSelectedPostListing.getState().setSelectedPostListing(null)
            }
          >
            <CloseTiny />
          </button>
        </div>
        <SpeedyLink
          className="shrink-0 flex gap-1 items-center "
          href={"/"}
        ></SpeedyLink>
        <ButtonPrimary fullWidth compact className="text-sm! mt-1">
          See Full Post <GoToArrow />
        </ButtonPrimary>
        <CommentsDrawerContent
          noCommentBox
          document_uri={props.selectedPost.document_uri}
          comments={[]}
        />
      </>
    );
};
