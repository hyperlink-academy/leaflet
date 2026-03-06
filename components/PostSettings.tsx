"use client";

import { ActionButton } from "components/ActionBar/ActionButton";
import { SettingsSmall } from "components/Icons/SettingsSmall";
import { Toggle } from "components/Toggle";
import { Popover } from "components/Popover";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";

type PostPreferences = {
  showComments?: boolean;
  showMentions?: boolean;
  showRecommends?: boolean;
};

export function PostSettings() {
  let { data: pub, normalizedPublication } = useLeafletPublicationData();
  let { rep } = useReplicache();

  let postPreferences = useSubscribe(rep, (tx) =>
    tx.get<PostPreferences | null>("post_preferences"),
  );

  if (!pub || !pub.publications) return null;

  let pubPrefs = normalizedPublication?.preferences;

  let showComments =
    postPreferences?.showComments ?? pubPrefs?.showComments ?? true;
  let showMentions =
    postPreferences?.showMentions ?? pubPrefs?.showMentions ?? true;
  let showRecommends =
    postPreferences?.showRecommends ?? pubPrefs?.showRecommends ?? true;

  const updatePreference = (
    field: keyof PostPreferences,
    value: boolean,
  ) => {
    let current: PostPreferences = postPreferences || {};
    rep?.mutate.updatePublicationDraft({
      preferences: { ...current, [field]: value },
    });
  };

  return (
    <Popover
      asChild
      side="right"
      align="start"
      className="max-w-xs w-[1000px]"
      trigger={
        <ActionButton
          icon={<SettingsSmall />}
          label="Settings"
        />
      }
    >
      <div className="text-primary flex flex-col">
        <div className="flex justify-between font-bold text-secondary bg-border-light -mx-3 -mt-2 px-3 py-2 mb-1">
          This Post Settings
        </div>
        <div className="flex flex-col gap-2">
          <Toggle
            toggle={showComments}
            onToggle={() => updatePreference("showComments", !showComments)}
          >
            <div className="font-bold">Show Comments</div>
          </Toggle>
          <Toggle
            toggle={showMentions}
            onToggle={() => updatePreference("showMentions", !showMentions)}
          >
            <div className="flex flex-col justify-start">
              <div className="font-bold">Show Mentions</div>
              <div className="text-tertiary text-sm leading-tight">
                Display a list of Bluesky mentions about your post
              </div>
            </div>
          </Toggle>
          <Toggle
            toggle={showRecommends}
            onToggle={() => updatePreference("showRecommends", !showRecommends)}
          >
            <div className="flex flex-col justify-start">
              <div className="font-bold">Show Recommends</div>
              <div className="text-tertiary text-sm leading-tight">
                Allow readers to recommend/like your post
              </div>
            </div>
          </Toggle>
        </div>
      </div>
    </Popover>
  );
}
