import { usePublicationData } from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { LeafletBGPicker } from "./Pickers/LeafletBGPicker";
import { useMemo, useState } from "react";
import { pickers, SectionArrow, setColorAttribute } from "./ThemeSetter";
import { theme } from "tailwind.config";
import { AccentPickers } from "./Pickers/AccentPickers";
import { PageThemePickers } from "./Pickers/PageThemePickers";
import { Color } from "react-aria-components";

export const PubThemeSetter = () => {
  let pub = usePublicationData();
  let [openPicker, setOpenPicker] = useState<pickers>("null");

  // TODO: Make this work with the pub record
  let pubBGImage = "/RSVPBackground/wavy.svg";
  let leafletBGRepeat = null;

  // TODO set the record value to the value of the picker
  let set = useMemo(
    () => (color: Color) => {
      return;
    },
    [],
  );

  return (
    <div>
      <div className="themeSetterContent flex flex-col w-full overflow-y-scroll no-scrollbar">
        <div className="themeBGLeaflet flex">
          <div
            className={`bgPicker flex flex-col gap-0 -mb-[6px] z-10 w-full `}
          >
            <div className="bgPickerBody w-full flex flex-col gap-2 p-2 mt-1 border border-[#CCCCCC] rounded-md">
              <LeafletBGPicker
                entityID={""}
                thisPicker={"leaflet"}
                openPicker={openPicker}
                setOpenPicker={setOpenPicker}
                closePicker={() => setOpenPicker("null")}
                setValue={set}
              />

              <PageThemePickers
                home
                entityID={""}
                openPicker={openPicker}
                setOpenPicker={(pickers) => setOpenPicker(pickers)}
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
          style={{
            backgroundImage: pubBGImage ? `url(${pubBGImage})` : undefined,
            backgroundRepeat: leafletBGRepeat ? "repeat" : "no-repeat",
            backgroundPosition: "center",
            backgroundSize: !leafletBGRepeat
              ? "cover"
              : `calc(${leafletBGRepeat}px / 2 )`,
          }}
          className={`bg-bg-leaflet p-3  mb-2 flex flex-col rounded-md  border border-border pb-0`}
        >
          <div className={`flex flex-col z-10 mt-4 -mb-[6px] `}>
            <AccentPickers
              entityID={""}
              openPicker={openPicker}
              setOpenPicker={(pickers) => setOpenPicker(pickers)}
            />
            <SectionArrow
              fill={theme.colors["accent-2"]}
              stroke={theme.colors["accent-1"]}
              className="ml-2"
            />
          </div>

          <SampleButton />
        </div>
        <SamplePage pubBGImage={pubBGImage} pubBGRepeat={leafletBGRepeat} />
      </div>
    </div>
  );
};

const SamplePage = (props: {
  pubBGImage: string;
  pubBGRepeat: number | null;
}) => {
  return (
    <div
      style={{
        backgroundImage: props.pubBGImage
          ? `url(${props.pubBGImage})`
          : undefined,
        backgroundRepeat: props.pubBGRepeat ? "repeat" : "no-repeat",
        backgroundPosition: "center",
        backgroundSize: !props.pubBGRepeat
          ? "cover"
          : `calc(${props.pubBGRepeat}px / 2 )`,
      }}
      className={`bg-bg-leaflet p-3 mb-2 flex flex-col rounded-md  border border-border pb-0`}
    >
      hello
    </div>
  );
};

function SampleButton() {
  return (
    <div className="w-full py-2 bg-accent-1 text-accent-2 font-bold text-lg">
      Sample Button
    </div>
  );
}
