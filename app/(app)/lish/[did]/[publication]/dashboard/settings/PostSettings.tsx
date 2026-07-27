import { Toggle } from "components/Toggle";
import { Radio } from "components/Checkbox";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { DoubleArrowRightTiny } from "components/Icons/DoubleArrowRightTiny";
import { Separator } from "components/Layout";
import type { PrevNextDirection } from "src/utils/mergePreferences";
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
  showFirstLast: boolean;
  setShowFirstLast: (v: boolean) => void;
  prevNextDirection: PrevNextDirection;
  setPrevNextDirection: (v: PrevNextDirection) => void;
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
        <div className="flex flex-col gap-2">
          <Toggle
            toggle={props.showPrevNext}
            onToggle={() => props.setShowPrevNext(!props.showPrevNext)}
          >
            <div className="font-bold text-secondary">
              Show Prev/Next Buttons on Post
            </div>
          </Toggle>

          <Toggle
            toggle={props.showFirstLast}
            onToggle={() => props.setShowFirstLast(!props.showFirstLast)}
          >
            <div className="font-bold text-secondary">
              Show First/Last Buttons on Post
            </div>
          </Toggle>

          {(props.showPrevNext || props.showFirstLast) && (
            <div className="flex flex-col gap-2 pt-1">
              <div className="font-bold text-secondary">
                Navigation Direction
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <DirectionRadio
                  direction="ltr"
                  label="Left to Right"
                  selected={props.prevNextDirection}
                  onSelect={props.setPrevNextDirection}
                />
                <DirectionRadio
                  direction="rtl"
                  label="Right to Left"
                  selected={props.prevNextDirection}
                  onSelect={props.setPrevNextDirection}
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-tertiary text-sm">Preview</div>
                <PrevNextDirectionPreview
                  direction={props.prevNextDirection}
                  showPrevNext={props.showPrevNext}
                  showFirstLast={props.showFirstLast}
                />
              </div>
            </div>
          )}
        </div>
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

function DirectionRadio(props: {
  direction: PrevNextDirection;
  label: string;
  selected: PrevNextDirection;
  onSelect: (v: PrevNextDirection) => void;
}) {
  return (
    <Radio
      id={`prev-next-direction-${props.direction}`}
      name="prev-next-direction"
      value={props.direction}
      checked={props.selected === props.direction}
      onChange={(e) => {
        if (!e.currentTarget.checked) return;
        props.onSelect(props.direction);
      }}
    >
      {props.label}
    </Radio>
  );
}

// Mirrors the layout of PostPrevNextButtons so the setting can be read at a
// glance without opening a post.
function PrevNextDirectionPreview(props: {
  direction: PrevNextDirection;
  showPrevNext: boolean;
  showFirstLast: boolean;
}) {
  let newer = props.showPrevNext ? "Newer Post" : undefined;
  let older = props.showPrevNext ? "Older Post" : undefined;
  let latest = props.showFirstLast ? "Latest Post" : undefined;
  let first = props.showFirstLast ? "First Post" : undefined;

  let adjacent =
    props.direction === "ltr"
      ? { left: older, right: newer }
      : { left: newer, right: older };
  let edge =
    props.direction === "ltr"
      ? { left: first, right: latest }
      : { left: latest, right: first };

  return (
    <div className="text-sm text-tertiary italic border border-border-light rounded-md px-2 py-1">
      <div className="flex justify-between w-full gap-4">
        <div className="flex gap-2 items-center min-w-0">
          {edge.left && (
            <>
              <div className="flex flex-row gap-1 items-center">
                <DoubleArrowRightTiny className="rotate-180 shrink-0" />
                {!adjacent.left && <div className="truncate">{edge.left}</div>}
              </div>
              {adjacent.left && <Separator />}
            </>
          )}
          {adjacent.left && (
            <div className="flex flex-row gap-1 items-center min-w-0">
              <ArrowRightTiny className="rotate-180 shrink-0" />
              <div className="truncate">{adjacent.left}</div>
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center justify-end min-w-0">
          {adjacent.right && (
            <div className="flex flex-row gap-1 items-center min-w-0">
              <div className="truncate">{adjacent.right}</div>
              <ArrowRightTiny className="shrink-0" />
            </div>
          )}
          {edge.right && (
            <>
              {adjacent.right && <Separator />}
              <div className="flex flex-row gap-1 items-center">
                {!adjacent.right && (
                  <div className="truncate">{edge.right}</div>
                )}
                <DoubleArrowRightTiny className="shrink-0" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
