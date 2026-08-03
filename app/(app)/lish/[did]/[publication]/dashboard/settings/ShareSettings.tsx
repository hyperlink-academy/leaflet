"use client";

import { Toggle } from "components/Toggle";
import { SettingsSection } from "components/SettingsLayout";

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
        <Toggle
          toggle={props.showComments}
          onToggle={() => props.setShowComments(!props.showComments)}
        >
          <div className="font-bold text-secondary">Show Comments</div>
        </Toggle>

        <Toggle
          toggle={props.showMentions}
          onToggle={() => props.setShowMentions(!props.showMentions)}
        >
          <div className="flex flex-col justify-start">
            <div className="font-bold text-secondary">Show Mentions</div>
            <div className="text-tertiary text-sm leading-tight">
              Display a list of Bluesky mentions about your post
            </div>
          </div>
        </Toggle>

        <Toggle
          toggle={props.showRecommends}
          onToggle={() => props.setShowRecommends(!props.showRecommends)}
        >
          <div className="flex flex-col justify-start">
            <div className="font-bold text-secondary">Show Recommends</div>
            <div className="text-tertiary text-sm leading-tight">
              Allow readers to recommend/like your post
            </div>
          </div>
        </Toggle>

        <Toggle
          toggle={props.showInDiscover}
          onToggle={() => props.setShowInDiscover(!props.showInDiscover)}
        >
          <div className="flex flex-col justify-start">
            <div className="font-bold text-secondary">Show in Discover</div>
            <div className="text-tertiary text-sm leading-tight">
              Your posts will appear in{" "}
              <a href="/reader" target="_blank">
                Leaflet Reader
              </a>{" "}
              and show up in search and tags.
            </div>
          </div>
        </Toggle>
      </div>
    </SettingsSection>
  );
}
