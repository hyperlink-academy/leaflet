"use client";
import { publishToPublication } from "actions/publishToPublication";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { DotLoader } from "components/utils/DotLoader";
import { useState } from "react";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity, useReplicache } from "src/replicache";
import { ButtonPrimary } from "components/Buttons";
import { Radio } from "components/Checkbox";
import { useRouter } from "next/router";
import { useParams } from "next/navigation";
import Link from "next/link";

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
  let params = useParams();

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
    <div className="flex flex-col gap-4 w-[640px] max-w-full">
      <h3>Publish Options</h3>
      <form onSubmit={() => submit()}>
        <div className="container flex flex-col gap-2 sm:p-3 p-4">
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

          <div
            className={`w-full pl-5 pb-4 ${shareOption !== "bluesky" ? "opacity-50" : ""}`}
          >
            <div className="opaque-container p-3  !rounded-lg">
              <div className="flex gap-2">
                <div className="bg-test rounded-full w-[42px] h-[42px] shrink-0" />
                <div className="flex flex-col ">
                  <div className="flex gap-2 pb-1">
                    <p className="font-bold">jared</p>
                    <p className="text-tertiary">@jrdprr</p>
                  </div>
                  <div>
                    This is some content that i wrote and will be posting
                  </div>
                  <div className="opaque-container overflow-hidden flex flex-col mt-4">
                    <div className="h-[260px] w-full bg-test" />
                    <div className="flex flex-col p-2">
                      <div className="font-bold">Title Here</div>
                      <div className="text-tertiary">
                        This is the description that you specified! Hopefully
                        it's the same.
                      </div>
                      <hr className="border-border-light mt-2 mb-1" />
                      <p className="text-xs text-tertiary">leaflet.pub</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <Link
              className="hover:!no-underline font-bold"
              href={`/${params.leaflet_id}`}
            >
              Back
            </Link>
            <ButtonPrimary type="submit" className="place-self-end h-[30px]">
              {isLoading ? <DotLoader /> : "Publish this Post!"}
            </ButtonPrimary>
          </div>
        </div>
      </form>
    </div>
  );
};

const PublishPostSuccess = () => {
  return <div>SUCESS!</div>;
};
