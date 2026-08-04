"use client";

import { SettingsSection, ToggleSetting } from "components/SettingsLayout";

export function ShareSettings(props: {
  showComments: boolean;
  setShowComments: (v: boolean) => void;
  showMentions: boolean;
  setShowMentions: (v: boolean) => void;
  showRecommends: boolean;
  setShowRecommends: (v: boolean) => void;
  showInDiscover: boolean;
  setShowInDiscover: (v: boolean) => void;
}) {
  return (
    <SettingsSection title="Share">
      <div className="flex flex-col gap-2">
        <ToggleSetting
          label="Show Comments"
          toggle={props.showComments}
          onToggle={() => props.setShowComments(!props.showComments)}
        />

        <ToggleSetting
          label="Show Mentions"
          helpText="Display a list of Bluesky mentions about your post"
          toggle={props.showMentions}
          onToggle={() => props.setShowMentions(!props.showMentions)}
        />

        <ToggleSetting
          label="Show Recommends"
          helpText="Allow readers to recommend/like your post"
          toggle={props.showRecommends}
          onToggle={() => props.setShowRecommends(!props.showRecommends)}
        />

        <ToggleSetting
          label="Show in Discover"
          helpText={
            <>
              Your posts will appear in{" "}
              <a href="/reader" target="_blank">
                Leaflet Reader
              </a>{" "}
              and show up in search and tags.
            </>
          }
          toggle={props.showInDiscover}
          onToggle={() => props.setShowInDiscover(!props.showInDiscover)}
        />
      </div>
    </SettingsSection>
  );
}
