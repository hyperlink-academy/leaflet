"use client";
import { publishToPublication } from "actions/publishToPublication";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { DotLoader } from "components/utils/DotLoader";
import { useState } from "react";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity, useReplicache } from "src/replicache";
import { ButtonPrimary } from "components/Buttons";
import { Radio } from "components/Checkbox";

export default function PublishPost() {
  let [publishState, setPublishState] = useState<"default" | "success">(
    "default",
  );
  return (
    <div className="publishPage w-screen h-screen bg-[#FDFCFA] flex place-items-center justify-center">
      {publishState === "default" ? (
        <PublishPostForm setPublishState={setPublishState} />
      ) : (
        <PublishPostSuccess />
      )}
    </div>
  );
}

const PublishPostForm = (props: {
  setPublishState: (s: "default" | "success") => void;
}) => {
  let [shareOption, setShareOption] = useState<"bluesky" | "quiet">("bluesky");
  let [isLoading, setIsLoading] = useState(false);

  async function submit() {
    let { data: pub, mutate } = useLeafletPublicationData();
    let { permission_token, rootEntity } = useReplicache();
    let rootPage = useEntity(rootEntity, "root/page")[0];
    let blocks = useBlocks(rootPage?.data.value);

    if (!pub || !pub.publications) return;
    setIsLoading(true);
    let doc = await publishToPublication({
      root_entity: rootEntity,
      blocks,
      publication_uri: pub.publications.uri,
      leaflet_id: permission_token.id,
      title: pub.title,
      description: pub.description,
    });
    setIsLoading(false);
    props.setPublishState("success");
    mutate();
  }

  return (
    <div className="flex flex-col gap-4 w-96 max-w-full">
      <form onSubmit={() => submit()}>
        <div className="container flex flex-col gap-2  sm:p-3 p-4">
          <h4>Publish</h4>
          <Radio
            checked={shareOption === "quiet"}
            onChange={(e) => {
              if (e.target === e.currentTarget) {
                setShareOption("quiet");
              }
            }}
            name="share-options"
            id="share-quietly"
            value="Share Quietly"
          >
            <div className="flex flex-col">
              <div className="font-bold">Share Quietly</div>
              <div className="text-sm text-tertiary font-normal">
                Subscribers will not be notified about this post
              </div>
            </div>
          </Radio>
          <Radio
            checked={shareOption === "bluesky"}
            onChange={(e) => {
              if (e.target === e.currentTarget) {
                setShareOption("bluesky");
              }
            }}
            name="share-options"
            id="share-bsky"
            value="Share on Bluesky"
          >
            <div className="flex flex-col">
              <div className="font-bold">Share on Bluesky</div>
              <div className="text-sm text-tertiary font-normal">
                Subscribers will get updated via a custom Bluesky feed
              </div>
            </div>
          </Radio>
          {shareOption === "bluesky" && (
            <div className="w-full pl-5 pb-6">
              <div className="bg-test rounded-md h-48 w-full flex place-items-center justify-center">
                bsky editor here!
              </div>
            </div>
          )}
          <ButtonPrimary type="submit" className="place-self-end h-[30px]">
            {isLoading ? <DotLoader /> : "Publish this Post!"}
          </ButtonPrimary>
        </div>
      </form>
      <div className="container !bg-border-light flex flex-col gap-1  sm:p-3 p-4">
        <div className="flex flex-col gap-0">
          <p className="text-tertiary text-sm">
            Pretty links to your post will look like this
          </p>
        </div>
        <div className="opaque-container  flex w-full h-[92px] ">
          <div className="flex flex-col gap-1 p-2 text-sm w-full ">
            <div className="font-bold truncate">title titletitletitl</div>
            <div className="text-tertiary text-xs h-full overflow-hidden">
              Here is a description, hopefully Here is a description, hopefully
              Here is a description, hopefully Here is a description, hopefully
              Here is a description, hopefully Here is a description, hopefully
              Here is a description, hopefully Here is a description, hopefully
              Here is a description, hopefully Here is a description, hopefully
            </div>
          </div>
          <div className="bg-test h-full w-24 shrink-0" />
        </div>
        <div className="opaque-container  rounded-md flex flex-col w-full overflow-hidden">
          <div className="bg-test h-48 w-full shrink-0" />

          <div className="flex flex-col gap-1 p-2 text-sm w-full ">
            <div className="font-bold truncate">title titletitletitl</div>
            <div className="text-tertiary text-xs h-[54px] overflow-hidden">
              Here is a description, hopefully Here is a description, hopefully
              Here is a description, hopefully Here is a description, hopefully
              Here is a description, hopefully Here is a description, hopefully
              Here is a description, hopefully Here is a description, hopefully
              Here is a description, hopefully Here is a description, hopefully
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PublishPostSuccess = () => {
  return <div>SUCESS!</div>;
};
