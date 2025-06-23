import { usePublicationData } from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { useMemo, useState } from "react";
import { pickers, SectionArrow } from "./ThemeSetter";
import { theme } from "tailwind.config";
import { AccentPickers } from "./Pickers/AccentPickers";
import {
  PageBackgroundPicker,
  PageTextPicker,
} from "./Pickers/PageThemePickers";
import { Color } from "react-aria-components";
import { PubLeafletPublication } from "lexicons/api";
import { AtUri } from "@atproto/syntax";

export const PubThemeSetter = () => {
  let [openPicker, setOpenPicker] = useState<pickers>("null");

  // TODO: Make this work with the pub record
  let pubBGImage = "";
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
              <PageBackgroundPicker
                entityID=""
                setValue={set}
                openPicker={openPicker}
                setOpenPicker={setOpenPicker}
              />
              <PageTextPicker
                entityID=""
                setValue={set}
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
          style={{
            backgroundImage: pubBGImage ? `url(${pubBGImage})` : undefined,
            backgroundRepeat: leafletBGRepeat ? "repeat" : "no-repeat",
            backgroundPosition: "center",
            backgroundSize: !leafletBGRepeat
              ? "cover"
              : `calc(${leafletBGRepeat}px / 2 )`,
          }}
          className={`bg-bg-leaflet p-3 flex flex-col rounded-md  border border-border `}
        >
          <div className={`flex flex-col z-10 mt-2 -mb-[6px] `}>
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
        <div className="flex flex-col mt-4 ">
          <div className="text-sm text-[#8C8C8C]">Page Preview</div>
          <SamplePage pubBGImage={pubBGImage} pubBGRepeat={leafletBGRepeat} />
        </div>
      </div>
    </div>
  );
};

const SamplePage = (props: {
  pubBGImage: string;
  pubBGRepeat: number | null;
}) => {
  let publication = usePublicationData();
  let record = publication?.record as PubLeafletPublication.Record | null;
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
      className={`bg-bg-leaflet p-3  flex flex-col gap-3 rounded-t-md  border border-border border-b-0 pb-4`}
    >
      <div className="flex flex-col justify-center text-center pt-1">
        {record?.icon && publication?.uri && (
          <div
            style={{
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "cover",
              backgroundImage: `url(/api/atproto_images?did=${new AtUri(publication.uri).host}&cid=${(record.icon?.ref as unknown as { $link: string })["$link"]})`,
            }}
            className="w-5 h-5 rounded-full place-self-center"
          />
        )}
        <div className="text-xs font-bold text-accent-contrast pt-1">
          {record?.name}
        </div>
        <div className="text-[8px] font-normal text-tertiary">
          {record?.description}
        </div>
      </div>
      <div className="flex flex-col text-[8px] py-1 px-[6px] rounded-md bg-test ">
        <div className="font-bold">A Sample Post</div>
        <div className="text-secondary italic">
          This is a sample description about the sample post
        </div>
      </div>
    </div>
  );
};

function SampleButton() {
  return (
    <div className="w-full py-2 bg-accent-1 text-accent-2 font-bold text-lg text-center rounded-lg">
      Sample Button
    </div>
  );
}
