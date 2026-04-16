import { Toggle } from "components/Toggle";
import { DashboardContainer } from "./SettingsContent";

export function PostSettings(props: {
  showComments: boolean;
  setShowComments: (v: boolean) => void;
  showMentions: boolean;
  setShowMentions: (v: boolean) => void;
  showRecommends: boolean;
  setShowRecommends: (v: boolean) => void;
  showPrevNext: boolean;
  setShowPrevNext: (v: boolean) => void;
  showInDiscover: boolean;
  setShowInDiscover: (v: boolean) => void;
}) {
  return (
    <>
      <DashboardContainer section="Discovery">
        <Toggle
          toggle={props.showInDiscover}
          onToggle={() => props.setShowInDiscover(!props.showInDiscover)}
        >
          <div className="flex flex-col justify-start">
            <div className="font-bold text-secondary">Make Public</div>
            <div className="text-tertiary text-sm leading-tight">
              Your posts will appear in{" "}
              <a href="/reader" target="_blank">
                Leaflet Reader
              </a>{" "}
              and show up in search and tags.
            </div>
          </div>
        </Toggle>
      </DashboardContainer>

      <DashboardContainer section="Post Layout">
        <Toggle
          toggle={props.showPrevNext}
          onToggle={() => props.setShowPrevNext(!props.showPrevNext)}
        >
          <div className="font-bold text-secondary">
            Show Prev/Next Buttons on Post
          </div>
        </Toggle>
      </DashboardContainer>

      <DashboardContainer section="Post Interactions">
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
        </div>
      </DashboardContainer>
    </>
  );
}
