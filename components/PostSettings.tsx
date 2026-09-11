"use client";

import { ActionButton } from "components/ActionBar/ActionButton";
import { SettingsSmall } from "components/Icons/SettingsSmall";
import { Toggle } from "components/Toggle";
import { Popover } from "components/Popover";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { useIsMobile } from "src/hooks/isMobile";

type PostPreferences = {
  showInDiscover?: boolean;
  showComments?: boolean;
  showMentions?: boolean;
  showRecommends?: boolean;
};

export function PostSettings() {
  let {
    data: pub,
    normalizedPublication,
    normalizedDocument,
  } = useLeafletPublicationData();
  let { rep } = useReplicache();

  let postPreferences = useSubscribe(rep, (tx) =>
    tx.get<PostPreferences | null>("post_preferences"),
  );

  if (!pub) return null;
  // Before the first publish the publish page owns the Discover choice, and a
  // standalone doc has nothing else to configure here.
  let showDiscoverToggle = !!pub.doc;
  if (!pub.publications && !showDiscoverToggle) return null;

  let pubPrefs = normalizedPublication?.preferences;

  let showInDiscover =
    postPreferences?.showInDiscover ??
    normalizedDocument?.preferences?.showInDiscover ??
    true;

  let showComments =
    postPreferences?.showComments ?? pubPrefs?.showComments ?? true;
  let showMentions =
    postPreferences?.showMentions ?? pubPrefs?.showMentions ?? true;
  let showRecommends =
    postPreferences?.showRecommends ?? pubPrefs?.showRecommends ?? true;

  const updatePreference = (field: keyof PostPreferences, value: boolean) => {
    let current: PostPreferences = postPreferences || {};
    rep?.mutate.updatePublicationDraft({
      preferences: { ...current, [field]: value },
    });
  };
  let isMobile = useIsMobile();
  return (
    <Popover
      asChild
      side={isMobile ? "top" : "right"}
      align="start"
      className="max-w-xs w-[1000px]"
      trigger={<ActionButton icon={<SettingsSmall />} label="Settings" />}
    >
      <div className="text-primary flex flex-col">
        <h3 className="pb-2">Settings for this post</h3>
        <div className="flex flex-col gap-2">
          {showDiscoverToggle && (
            <Toggle
              toggle={showInDiscover}
              onToggle={() =>
                updatePreference("showInDiscover", !showInDiscover)
              }
            >
              <div className="flex flex-col justify-start">
                <div className="font-bold">Show in Discover</div>
                <div className="text-tertiary text-sm leading-tight">
                  List this post in Leaflet&apos;s Discover feed and other
                  standard.site reader feeds
                </div>
              </div>
            </Toggle>
          )}
          {pub.publications && (
            <>
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
                onToggle={() =>
                  updatePreference("showRecommends", !showRecommends)
                }
              >
                <div className="flex flex-col justify-start">
                  <div className="font-bold">Show Recommends</div>
                  <div className="text-tertiary text-sm leading-tight">
                    Allow readers to recommend/like your post
                  </div>
                </div>
              </Toggle>
            </>
          )}
        </div>
      </div>
    </Popover>
  );
}
