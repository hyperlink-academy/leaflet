"use client";
import { Popover } from "components/Popover";
import { theme } from "../../tailwind.config";

import { Color } from "react-aria-components";

import { LeafletBGPicker } from "./Pickers/LeafletBGPicker";
import {
  PageBackgroundPicker,
  PageBorderHider,
  PageThemePickers,
} from "./Pickers/PageThemePickers";
import { useMemo, useState } from "react";
import { ReplicacheMutators, useEntity, useReplicache } from "src/replicache";
import { Replicache } from "replicache";
import { FilterAttributes } from "src/replicache/attributes";
import { colorToString } from "components/ThemeManager/useColorAttribute";
import { useEntitySetContext } from "components/EntitySetProvider";
import { ActionButton } from "components/ActionBar/ActionButton";
import { CheckboxChecked } from "components/Icons/CheckboxChecked";
import { CheckboxEmpty } from "components/Icons/CheckboxEmpty";
import { PaintSmall } from "components/Icons/PaintSmall";
import { AccentPickers } from "./Pickers/AccentPickers";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useIsMobile } from "src/hooks/isMobile";
import { Toggle } from "components/Toggle";

export type pickers =
  | "null"
  | "leaflet"
  | "page"
  | "accent-1"
  | "accent-2"
  | "text"
  | "highlight-1"
  | "highlight-2"
  | "highlight-3"
  | "page-background-image";

export function setColorAttribute(
  rep: Replicache<ReplicacheMutators> | null,
  entity: string,
) {
  return (attribute: keyof FilterAttributes<{ type: "color" }>) =>
    (color: Color) =>
      rep?.mutate.assertFact({
        entity,
        attribute,
        data: { type: "color", value: colorToString(color, "hsba") },
      });
}
export const ThemePopover = (props: { entityID: string; home?: boolean }) => {
  let { rep } = useReplicache();
  let { data: pub } = useLeafletPublicationData();
  let isMobile = useIsMobile();

  // I need to get these variables from replicache and then write them to the DB. I also need to parse them into a state that can be used here.
  let permission = useEntitySetContext().permissions.write;
  let leafletBGImage = useEntity(props.entityID, "theme/background-image");
  let leafletBGRepeat = useEntity(
    props.entityID,
    "theme/background-image-repeat",
  );

  let [openPicker, setOpenPicker] = useState<pickers>(
    props.home === true ? "leaflet" : "null",
  );
  let set = useMemo(() => {
    return setColorAttribute(rep, props.entityID);
  }, [rep, props.entityID]);

  if (!permission) return null;
  if (pub) return null;

  return (
    <>
      <Popover
        className="w-80 bg-white"
        arrowFill="#FFFFFF"
        asChild
        side={isMobile ? "top" : "right"}
        align={isMobile ? "center" : "start"}
        trigger={<ActionButton icon={<PaintSmall />} label="Theme" />}
      >
        <div className="themeSetterContent flex flex-col w-full overflow-y-scroll no-scrollbar">
          <div className="themeBGLeaflet flex">
            <div
              className={`bgPicker flex flex-col gap-0 -mb-[6px] z-10 w-full `}
            >
              <div className="bgPickerBody w-full flex flex-col gap-2 p-2 mt-1 border border-[#CCCCCC] rounded-md">
                <LeafletBGPicker
                  entityID={props.entityID}
                  thisPicker={"leaflet"}
                  openPicker={openPicker}
                  setOpenPicker={setOpenPicker}
                  closePicker={() => setOpenPicker("null")}
                  setValue={set("theme/page-background")}
                />
                <PageBackgroundPicker
                  entityID={props.entityID}
                  setValue={set("theme/card-background")}
                  openPicker={openPicker}
                  setOpenPicker={setOpenPicker}
                  home={props.home}
                />
                <hr className=" border-[#CCCCCC]" />
                <PageBorderHider
                  entityID={props.entityID}
                  openPicker={openPicker}
                  setOpenPicker={setOpenPicker}
                />
              </div>

              <SectionArrow
                fill="white"
                stroke="#CCCCCC"
                className="ml-2 -mt-[1px]"
              />
            </div>
          </div>

          <div
            onClick={(e) => {
              e.currentTarget === e.target && setOpenPicker("leaflet");
            }}
            style={{
              backgroundImage: leafletBGImage
                ? `url(${leafletBGImage.data.src})`
                : undefined,
              backgroundRepeat: leafletBGRepeat ? "repeat" : "no-repeat",
              backgroundPosition: "center",
              backgroundSize: !leafletBGRepeat
                ? "cover"
                : `calc(${leafletBGRepeat.data.value}px / 2 )`,
            }}
            className={`bg-bg-leaflet px-3 pt-4  pb-0 mb-2 flex flex-col gap-4 rounded-md  border border-border`}
          >
            <PageThemePickers
              entityID={props.entityID}
              openPicker={openPicker}
              setOpenPicker={(pickers) => setOpenPicker(pickers)}
            />
            <div className="flex flex-col -gap-[6px]">
              <div className={`flex flex-col z-10  -mb-[6px] `}>
                <AccentPickers
                  entityID={props.entityID}
                  openPicker={openPicker}
                  setOpenPicker={(pickers) => setOpenPicker(pickers)}
                />
                <SectionArrow
                  fill={theme.colors["accent-2"]}
                  stroke={theme.colors["accent-1"]}
                  className="ml-2"
                />
              </div>

              <SampleButton
                entityID={props.entityID}
                setOpenPicker={setOpenPicker}
              />
            </div>

            <SamplePage
              setOpenPicker={setOpenPicker}
              home={props.home}
              entityID={props.entityID}
            />
          </div>
          {!props.home && <WatermarkSetter entityID={props.entityID} />}
        </div>
      </Popover>
    </>
  );
};

function WatermarkSetter(props: { entityID: string }) {
  let { rep } = useReplicache();
  let checked = useEntity(props.entityID, "theme/page-leaflet-watermark");

  function handleToggle() {
    rep?.mutate.assertFact({
      entity: props.entityID,
      attribute: "theme/page-leaflet-watermark",
      data: { type: "boolean", value: !checked?.data.value },
    });
  }
  return (
    <div className="flex gap-2 items-start mt-0.5">
      <Toggle
        toggleOn={!!checked?.data.value}
        setToggleOn={() => {
          handleToggle();
        }}
        disabledColor1="#8C8C8C"
        disabledColor2="#DBDBDB"
      />
      <button
        className="flex gap-2 items-center -mt-0.5"
        onClick={() => {
          handleToggle();
        }}
      >
        <div className="flex flex-col gap-0 items-start">
          <div className="font-bold">Show Leaflet Watermark</div>
          <div className="text-sm text-[#969696]">Help us spread the word!</div>
        </div>
      </button>
    </div>
  );
}

const SampleButton = (props: {
  entityID: string;
  setOpenPicker: (thisPicker: pickers) => void;
}) => {
  return (
    <div
      onClick={(e) => {
        e.target === e.currentTarget && props.setOpenPicker("accent-1");
      }}
      className="pointer-cursor font-bold relative text-center text-lg py-2  rounded-md bg-accent-1 text-accent-2 shadow-md flex items-center justify-center"
    >
      <div
        className="cursor-pointer w-fit"
        onClick={() => {
          props.setOpenPicker("accent-2");
        }}
      >
        Example Button
      </div>
    </div>
  );
};
const SamplePage = (props: {
  entityID: string;
  home: boolean | undefined;
  setOpenPicker: (picker: "page" | "text") => void;
}) => {
  let pageBGImage = useEntity(props.entityID, "theme/card-background-image");
  let pageBGRepeat = useEntity(
    props.entityID,
    "theme/card-background-image-repeat",
  );
  let pageBGOpacity = useEntity(
    props.entityID,
    "theme/card-background-image-opacity",
  );
  let pageBorderHidden = useEntity(props.entityID, "theme/card-border-hidden")
    ?.data.value;

  return (
    <div
      onClick={(e) => {
        e.currentTarget === e.target && props.setOpenPicker("page");
      }}
      className={`
        text-primary relative
        ${
          pageBorderHidden
            ? "py-2 px-0 border border-transparent"
            : `cursor-pointer p-2 border border-border border-b-transparent shadow-md
          ${props.home ? "rounded-md " : "rounded-t-lg "}`
        }`}
      style={
        pageBorderHidden
          ? undefined
          : {
              backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
            }
      }
    >
      <div
        className="background absolute top-0 right-0 bottom-0 left-0 z-0  rounded-t-lg"
        style={
          pageBorderHidden
            ? undefined
            : {
                backgroundImage: pageBGImage
                  ? `url(${pageBGImage.data.src})`
                  : undefined,

                backgroundRepeat: pageBGRepeat ? "repeat" : "no-repeat",
                opacity: pageBGOpacity?.data.value || 1,
                backgroundSize: !pageBGRepeat
                  ? "cover"
                  : `calc(${pageBGRepeat.data.value}px / 2 )`,
              }
        }
      />
      <div className="z-10 relative">
        <p
          onClick={() => {
            props.setOpenPicker("text");
          }}
          className="cursor-pointer font-bold w-fit"
        >
          Hello!
        </p>
        <small onClick={() => props.setOpenPicker("text")}>
          Welcome to{" "}
          <span className="font-bold text-accent-contrast">Leaflet</span> — a
          fun and easy way to make, share, and collab on little bits of paper ✨
        </small>
      </div>
    </div>
  );
};

export const SectionArrow = (props: {
  fill: string;
  stroke: string;
  className: string;
}) => {
  return (
    <svg
      width="24"
      height="12"
      viewBox="0 0 24 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path d="M11.9999 12L24 0H0L11.9999 12Z" fill={props.fill} />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.33552 0L12 10.6645L22.6645 0H24L12 12L0 0H1.33552Z"
        fill={props.stroke}
      />
    </svg>
  );
};
