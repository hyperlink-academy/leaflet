import { PubLeafletPublication } from "lexicons/api";
import { usePublicationData } from "../PublicationSWRProvider";
import { PubSettingsHeader } from "./PublicationSettings";
import { useState } from "react";
import { Toggle } from "components/Toggle";
import { updatePublication } from "app/lish/createPub/updatePublication";
import { useToaster } from "components/Toast";
import { mutate } from "swr";

export const PostOptions = (props: {
  backToMenu: () => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
}) => {
  let { data } = usePublicationData();

  let { publication: pubData } = data || {};
  let record = pubData?.record as PubLeafletPublication.Record;

  let [showComments, setShowComments] = useState(
    record?.preferences?.showComments === undefined
      ? true
      : record.preferences.showComments,
  );
  let [showMentions, setShowMentions] = useState(
    record?.preferences?.showMentions === undefined
      ? true
      : record.preferences.showMentions,
  );
  let [showPrevNext, setShowPrevNext] = useState(
    record?.preferences?.showPrevNext === undefined
      ? true
      : record.preferences.showPrevNext,
  );

  let toast = useToaster();
  return (
    <form
      onSubmit={async (e) => {
        if (!pubData) return;
        e.preventDefault();
        props.setLoading(true);
        let data = await updatePublication({
          name: record.name,
          uri: pubData.uri,
          preferences: {
            showInDiscover:
              record?.preferences?.showInDiscover === undefined
                ? true
                : record.preferences.showInDiscover,
            showComments: showComments,
            showMentions: showMentions,
            showPrevNext: showPrevNext,
          },
        });
        toast({ type: "success", content: <strong>Posts Updated!</strong> });
        console.log(record.preferences?.showPrevNext);
        props.setLoading(false);
        mutate("publication-data");
      }}
      className="text-primary flex flex-col"
    >
      <PubSettingsHeader
        loading={props.loading}
        setLoadingAction={props.setLoading}
        backToMenuAction={props.backToMenu}
        state={"post-options"}
      >
        Post Options
      </PubSettingsHeader>
      <h4 className="mb-1">Layout</h4>
      <Toggle
        toggle={showPrevNext}
        onToggle={() => {
          setShowPrevNext(!showPrevNext);
        }}
      >
        <div className="flex flex-col justify-start">
          <div className="font-bold">Show Prev/Next Buttons</div>
          <div className="text-tertiary text-sm leading-tight">
            Buttons at the bottom of each post navigate to the previous and next
            posts
          </div>
        </div>
      </Toggle>
      <hr className="my-2 border-border-light" />
      <h4 className="mb-1">Interactions</h4>
      <div className="flex flex-col gap-2">
        <Toggle
          toggle={showComments}
          onToggle={() => {
            setShowComments(!showComments);
          }}
        >
          <div className="font-bold">Show Comments</div>
        </Toggle>

        <Toggle
          toggle={showMentions}
          onToggle={() => {
            setShowMentions(!showMentions);
          }}
        >
          <div className="flex flex-col justify-start">
            <div className="font-bold">Show Mentions</div>
            <div className="text-tertiary text-sm leading-tight">
              Display a list of posts on Bluesky and Leaflet that mention your
              post
            </div>
          </div>
        </Toggle>
      </div>
    </form>
  );
};
