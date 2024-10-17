import { ReplicacheMutators, useEntity, useReplicache } from "src/replicache";
import { useColorAttribute } from "./useColorAttribute";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  LeafletBGPicker,
  ColorPicker,
  pickers,
  SectionArrow,
  setColorAttribute,
  PageBGPicker,
  ImageInput,
} from "./ThemeSetter";
import { useMemo, useState } from "react";
import { CanvasBackgroundPattern } from "components/Pages/Canvas";
import { Replicache } from "replicache";
import { theme } from "tailwind.config";
import { BlockImageSmall, PaintSmall } from "components/Icons";
import { ButtonPrimary } from "components/Buttons";

export const PageThemeSetter = (props: { entityID: string }) => {
  let { rep, rootEntity } = useReplicache();
  let permission = useEntitySetContext().permissions.write;
  let [openPicker, setOpenPicker] = useState<pickers>("null");

  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";

  let accent1Value = useColorAttribute(
    props.entityID,
    "theme/accent-background",
  );
  let accent2Value = useColorAttribute(props.entityID, "theme/accent-text");
  let pageValue = useColorAttribute(props.entityID, "theme/card-background");
  let primaryValue = useColorAttribute(props.entityID, "theme/primary");

  let leafletBGImage = useEntity(rootEntity, "theme/background-image");
  let leafletBGRepeat = useEntity(rootEntity, "theme/background-image-repeat");
  let pageBGImage = useEntity(props.entityID, "theme/card-background-image");
  let pageBGRepeat = useEntity(
    props.entityID,
    "theme/card-background-image-repeat",
  );
  let pageBGOpacity = useEntity(
    props.entityID,
    "theme/card-background-image-opacity",
  );

  let set = useMemo(() => {
    return setColorAttribute(rep, props.entityID);
  }, [rep, props.entityID]);

  if (!permission) return null;

  return (
    <>
      <div className="pageThemeSetter flex flex-row gap-2 px-3 py-1 ">
        <div className="gap-2 flex font-bold ">
          <PaintSmall /> Theme Page
        </div>
        <ButtonPrimary
          compact
          onClick={() => {
            if (!rep) return;
            rep.mutate.retractAttribute({
              entity: props.entityID,
              attribute: [
                "theme/primary",
                "theme/card-background",
                "theme/accent-background",
                "theme/accent-text",
                "theme/card-background-image",
                "theme/card-background-image-repeat",
                "theme/card-background-image-opacity",
                "canvas/background-pattern",
              ],
            });
          }}
        >
          reset
        </ButtonPrimary>
      </div>
      <div
        className="pageThemeSetterContent bg-bg-leaflet w-80 p-3 pb-0 flex flex-col gap-2 rounded-md -mb-1"
        style={{
          backgroundImage: `url(${leafletBGImage?.data.src})`,
          backgroundPosition: "center",
          backgroundRepeat: leafletBGRepeat ? "repeat" : "no-repeat",
          backgroundSize: !leafletBGRepeat
            ? "cover"
            : `calc(${leafletBGRepeat.data.value}px / 2 )`,
        }}
      >
        <div
          className="pageAccentControls text-accent-2 flex flex-col gap-2 h-full  bg-bg-leaflet mt-4 p-2 rounded-md border border-accent-2 shadow-[0_0_0_1px_rgb(var(--accent-1))]"
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
        <div className="flex flex-col -mb-[14px] mt-4 z-10">
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
            <ColorPicker
              label="Page"
              value={pageValue}
              setValue={set("theme/card-background")}
              thisPicker={"page"}
              openPicker={openPicker}
              setOpenPicker={setOpenPicker}
              closePicker={() => setOpenPicker("null")}
              alpha
            >
              {(pageBGImage === null || !pageBGImage) && (
                <label
                  className={`m-0 h-max w-full  py-0.5 px-1
                    bg-accent-1  outline-transparent
                    rounded-md text-base font-bold text-accent-2
                    hover:cursor-pointer
                    flex gap-2 items-center justify-center shrink-0
                    transparent-outline hover:outline-accent-1 outline-offset-1
                  `}
                >
                  <BlockImageSmall /> Add Background Image
                  <div className="hidden">
                    <ImageInput
                      entityID={props.entityID}
                      onChange={() => setOpenPicker("page-background-image")}
                      card
                    />
                  </div>
                </label>
              )}
            </ColorPicker>
            {pageBGImage && pageBGImage !== null && (
              <PageBGPicker
                entityID={props.entityID}
                thisPicker={"page-background-image"}
                openPicker={openPicker}
                setOpenPicker={setOpenPicker}
                closePicker={() => setOpenPicker("null")}
                setValue={set("theme/card-background")}
              />
            )}
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
          className="relative rounded-t-lg p-2 shadow-md text-primary border border-border border-b-transparent"
          style={{
            backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
          }}
        >
          <div
            className="background absolute top-0 right-0 bottom-0 left-0 z-0  rounded-t-lg"
            style={{
              backgroundImage: `url(${pageBGImage?.data.src})`,

              backgroundRepeat: pageBGRepeat ? "repeat" : "no-repeat",
              opacity: pageBGOpacity?.data.value || 1,
              backgroundSize: !pageBGRepeat
                ? "cover"
                : `calc(${pageBGRepeat.data.value}px / 2 )`,
            }}
          />
          <div className="relative">
            <p className="font-bold">Theme Each Page!</p>
            <small className="">
              OMG! You can theme each page individually in{" "}
              <span className="font-bold text-accent-contrast">Leaflet</span>!
              <br /> Buttons and sections appear like:
            </small>
            <div className="p-2 mt-2 border border-border bg-bg-page rounded-md text-sm flex justify-between items-center font-bold text-secondary">
              Happy Theming!
              <div className="bg-accent-1 text-accent-2 py-0.5 px-2  w-fit text-center text-sm font-bold rounded-md">
                Button
              </div>
            </div>
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
