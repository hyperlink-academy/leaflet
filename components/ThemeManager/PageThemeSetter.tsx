import { ReplicacheMutators, useEntity, useReplicache } from "src/replicache";
import { useColorAttribute } from "./useColorAttribute";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  BGPicker,
  ColorPicker,
  pickers,
  SectionArrow,
  setColorAttribute,
} from "./ThemeSetter";
import { useMemo, useState } from "react";
import { CanvasBackgroundPattern } from "components/Canvas";
import { Replicache } from "replicache";
import { theme } from "tailwind.config";
import { PaintSmall } from "components/Icons";

export const PageThemeSetter = (props: { entityID: string }) => {
  let { rep, rootEntity } = useReplicache();
  let permission = useEntitySetContext().permissions.write;

  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";
  let primaryValue = useColorAttribute(props.entityID, "theme/primary");
  let accent1Value = useColorAttribute(
    props.entityID,
    "theme/accent-background",
  );
  let accent2Value = useColorAttribute(props.entityID, "theme/accent-text");
  let [openPicker, setOpenPicker] = useState<pickers>("null");

  let set = useMemo(() => {
    return setColorAttribute(rep, props.entityID);
  }, [rep, props.entityID]);

  let leafletBGImage = useEntity(rootEntity, "theme/background-image");
  let leafletBGRepeat = useEntity(rootEntity, "theme/background-image-repeat");

  if (!permission) return null;

  return (
    <>
      <div className="gap-2 flex font-bold px-3 pt-2 pb-1 ">
        <PaintSmall /> Theme Page
      </div>
      <div
        className="bg-bg-leaflet w-80 p-3 pb-0 flex flex-col gap-2 rounded-md -mb-1"
        style={{
          backgroundImage: `url(${leafletBGImage?.data.src})`,
          backgroundRepeat: leafletBGRepeat ? "repeat" : "no-repeat",
          backgroundSize: !leafletBGRepeat
            ? "cover"
            : `calc(${leafletBGRepeat.data.value}px / 2 )`,
        }}
      >
        <div
          className="themeLeafletControls text-accent-2 flex flex-col gap-2 h-full  bg-bg-leaflet p-2 rounded-md border border-accent-2 shadow-[0_0_0_1px_rgb(var(--accent-1))]"
          style={{
            backgroundColor: "rgba(var(--accent-1), 0.6)",
          }}
        >
          <ColorPicker
            label="Accent"
            value={accent1Value}
            setValue={set("theme/accent-background")}
            thisPicker={"accent-1"}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            closePicker={() => setOpenPicker("null")}
          />
          <ColorPicker
            label="Text on Accent"
            value={accent2Value}
            setValue={set("theme/accent-text")}
            thisPicker={"accent-2"}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            closePicker={() => setOpenPicker("null")}
          />
        </div>
        <div className="flex flex-col -mb-[14px] z-10">
          <div
            className="pageThemeBG flex flex-col gap-2 h-full text-primary bg-bg-leaflet p-2 rounded-md border border-primary shadow-[0_0_0_1px_rgb(var(--bg-page))]"
            style={{ backgroundColor: "rgba(var(--bg-page), 0.6)" }}
          >
            {pageType === "canvas" && (
              <>
                <BackgroundPatternPicker entityID={props.entityID} rep={rep} />{" "}
                <hr className="border-border-light w-full" />
              </>
            )}
            <BGPicker
              entityID={props.entityID}
              thisPicker={"leaflet"}
              openPicker={openPicker}
              setOpenPicker={setOpenPicker}
              closePicker={() => setOpenPicker("null")}
              setValue={set("theme/card-background")}
              card
            />

            <ColorPicker
              label="Text"
              value={primaryValue}
              setValue={set("theme/primary")}
              thisPicker={"text"}
              openPicker={openPicker}
              setOpenPicker={setOpenPicker}
              closePicker={() => setOpenPicker("null")}
            />
          </div>
          <SectionArrow
            fill={theme.colors["primary"]}
            stroke={theme.colors["bg-page"]}
            className="ml-2"
          />
        </div>
        <div
          className="rounded-t-lg p-2  border border-border border-b-transparent shadow-md text-primary"
          style={{
            backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
          }}
        >
          <p className="font-bold">Theme Each Page!</p>
          <small className="">
            You can theme each page individually in{" "}
            <span className="font-bold text-accent-contrast">Leaflet</span>!
            <br /> Buttons and links will appear like this
          </small>
          <div className="bg-accent-1 text-accent-2 py-1 mt-2 w-full text-center text-sm font-bold rounded-md">
            Example Button
          </div>
          <div className="text-accent-contrast mt-1 font-bold w-full text-center text-sm">
            Example Link
          </div>
        </div>
      </div>
    </>
  );
};

const BackgroundPatternPicker = (props: {
  entityID: string;
  rep: Replicache<ReplicacheMutators> | null;
}) => {
  let selectedPattern = useEntity(props.entityID, "canvas/background-pattern")
    ?.data.value;
  return (
    <div className="flex gap-2 h-8 ">
      <button
        className={`w-full rounded-md bg-bg-page border  ${selectedPattern === "grid" ? "outline outline-tertiary border-tertiary" : "transparent-outline hover:outline-border border-border "}`}
        onMouseDown={() => {
          props.rep &&
            props.rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "canvas/background-pattern",
              data: { type: "canvas-pattern-union", value: "grid" },
            });
        }}
      >
        <CanvasBackgroundPattern pattern="grid" scale={0.5} />
      </button>
      <button
        className={`w-full rounded-md bg-bg-page border  ${selectedPattern === "dot" ? "outline outline-tertiary border-tertiary" : "transparent-outline hover:outline-border border-border "}`}
        onMouseDown={() => {
          props.rep &&
            props.rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "canvas/background-pattern",
              data: { type: "canvas-pattern-union", value: "dot" },
            });
        }}
      >
        <CanvasBackgroundPattern pattern="dot" scale={0.5} />
      </button>
      <button
        className={`w-full rounded-md bg-bg-page border  ${selectedPattern === "plain" ? "outline outline-tertiary border-tertiary" : "transparent-outline hover:outline-border border-border "}`}
        onMouseDown={() => {
          props.rep &&
            props.rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "canvas/background-pattern",
              data: { type: "canvas-pattern-union", value: "plain" },
            });
        }}
      >
        <CanvasBackgroundPattern pattern="plain" />
      </button>
    </div>
  );
};
