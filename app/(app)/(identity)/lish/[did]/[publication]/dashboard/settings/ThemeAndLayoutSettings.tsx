"use client";

import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { DoubleArrowRightTiny } from "components/Icons/DoubleArrowRightTiny";
import { GoToArrow } from "components/Icons/GoToArrow";
import { Separator } from "components/Layout";
import { SettingsSection, ToggleSetting } from "components/SettingsLayout";
import { SpeedyLink } from "components/SpeedyLink";
import { ToggleGroup } from "components/ToggleGroup";
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
        <hr />
        <ToggleSetting
          label="Show Prev/Next Buttons on Post"
          toggle={props.showPrevNext}
          onToggle={() => props.setShowPrevNext(!props.showPrevNext)}
        />

        <ToggleSetting
          label="Show First/Last Buttons on Post"
          toggle={props.showFirstLast}
          onToggle={() => props.setShowFirstLast(!props.showFirstLast)}
        />

        {(props.showPrevNext || props.showFirstLast) && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-between">
              <div className="font-bold text-secondary">
                Navigation Direction
              </div>
              <ToggleGroup
                value={props.prevNextDirection}
                onChange={props.setPrevNextDirection}
                options={[
                  {
                    value: "ltr",
                    label: (
                      <div className="flex flex-row shrink-0 items-center">
                        L <ArrowRightTiny className="scale-80" /> R
                      </div>
                    ),
                  },
                  {
                    value: "rtl",
                    label: (
                      <div className="flex flex-row shrink-0 items-center">
                        L <ArrowRightTiny className="scale-80 rotate-180" /> R
                      </div>
                    ),
                  },
                ]}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="text-tertiary text-xs uppercase">Preview</div>
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
      className="text-left flex gap-2 items-center font-bold no-underline! justify-between w-full text-secondary"
      href={href}
    >
      Customize Theme <GoToArrow className="text-accent-contrast" />
    </SpeedyLink>
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
    <div className="opaque-container  text-tertiary italic border border-border-light rounded-md px-2 py-1">
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
