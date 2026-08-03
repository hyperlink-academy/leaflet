"use client";

import { Toggle } from "components/Toggle";
import { Radio } from "components/Checkbox";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { DoubleArrowRightTiny } from "components/Icons/DoubleArrowRightTiny";
import { GoToArrow } from "components/Icons/GoToArrow";
import { Separator } from "components/Layout";
import { SettingsSection } from "components/SettingsLayout";
import { SpeedyLink } from "components/SpeedyLink";
import { useParams } from "next/navigation";
import type { PrevNextDirection } from "src/utils/mergePreferences";
import { usePublicationData } from "../PublicationSWRProvider";

export function ThemeAndLayoutSettings(props: {
  showPrevNext: boolean;
  setShowPrevNext: (v: boolean) => void;
  showFirstLast: boolean;
  setShowFirstLast: (v: boolean) => void;
  prevNextDirection: PrevNextDirection;
  setPrevNextDirection: (v: PrevNextDirection) => void;
}) {
  return (
    <SettingsSection title="Theme and Layout">
      <div className="flex flex-col gap-2">
        <CustomizeThemeLink />

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
            <div className="font-bold text-secondary">Navigation Direction</div>
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
    </SettingsSection>
  );
}

function CustomizeThemeLink() {
  let params = useParams<{ did: string; publication: string }>();
  let { data } = usePublicationData();
  // Once a publication has adopted the new page editor (it has a draft
  // leaflet), theme editing — background image included — lives there, so send
  // people to it rather than the legacy theme-settings editor.
  let href = data?.publication?.draft_leaflet
    ? `/lish/${params.did}/${params.publication}/edit`
    : `/lish/${params.did}/${params.publication}/theme-settings`;

  return (
    <SpeedyLink
      className="text-left flex gap-2 items-center text-accent-contrast font-bold no-underline! w-fit"
      href={href}
    >
      Customize Theme <GoToArrow />
    </SpeedyLink>
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
