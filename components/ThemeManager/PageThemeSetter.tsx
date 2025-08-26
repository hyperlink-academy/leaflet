import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { pickers, SectionArrow, setColorAttribute } from "./ThemeSetter";

import { TextPickers } from "./Pickers/TextPickers";
import { PageBackgroundPicker } from "./Pickers/BackgroundPickers";
import { useMemo, useState } from "react";
import { theme } from "tailwind.config";
import { ButtonPrimary } from "components/Buttons";
import { PaintSmall } from "components/Icons/PaintSmall";
import { AccentPickers } from "./Pickers/AccentPickers";
import Page from "twilio/lib/base/Page";

export const PageThemeSetter = (props: { entityID: string }) => {
  let { rootEntity } = useReplicache();
  let permission = useEntitySetContext().permissions.write;
  let [openPicker, setOpenPicker] = useState<pickers>("null");

  let leafletBGImage = useEntity(rootEntity, "theme/background-image");
  let leafletBGRepeat = useEntity(rootEntity, "theme/background-image-repeat");

  if (!permission) return null;

  let { rep } = useReplicache();
  let set = useMemo(() => {
    return setColorAttribute(rep, props.entityID);
  }, [rep, props.entityID]);

  return (
    <>
      <div className="pageThemeSetter flex flex-row gap-2 px-3 py-1 z-10">
        <div className="gap-2 flex font-bold ">
          <PaintSmall /> Theme Page
        </div>
        <ResetButton entityID={props.entityID} />
      </div>

      <div
        className="pageThemeSetterContent bg-bg-leaflet w-80 p-3 pb-0 flex flex-col gap-4 rounded-md -mb-1"
        style={{
          backgroundImage: leafletBGImage
            ? `url(${leafletBGImage.data.src})`
            : undefined,
          backgroundPosition: "center",
          backgroundRepeat: leafletBGRepeat ? "repeat" : "no-repeat",
          backgroundSize: !leafletBGRepeat
            ? "cover"
            : `calc(${leafletBGRepeat.data.value}px / 2 )`,
        }}
      >
        <div
          className="pageThemeBG flex flex-col gap-2 h-full text-primary bg-bg-leaflet p-2 rounded-md border border-primary shadow-[0_0_0_1px_rgb(var(--bg-page))]"
          style={{ backgroundColor: "rgba(var(--bg-page), 0.6)" }}
        >
          <PageBackgroundPicker
            entityID={props.entityID}
            openPicker={openPicker}
            setOpenPicker={(pickers) => setOpenPicker(pickers)}
            setValue={set("theme/card-background")}
          />
        </div>

        <div className="flex flex-col  z-10">
          <TextPickers
            entityID={props.entityID}
            openPicker={openPicker}
            setOpenPicker={(pickers) => setOpenPicker(pickers)}
            noFontOptions
          />
        </div>
        <AccentPickers
          entityID={props.entityID}
          openPicker={openPicker}
          setOpenPicker={(pickers) => setOpenPicker(pickers)}
        />
        <SamplePage entityID={props.entityID} />
      </div>
    </>
  );
};

const ResetButton = (props: { entityID: string }) => {
  let { rep } = useReplicache();

  return (
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
            "theme/card-border-hidden",
            "canvas/background-pattern",
          ],
        });
      }}
    >
      reset
    </ButtonPrimary>
  );
};

const SamplePage = (props: { entityID: string }) => {
  let { rootEntity } = useReplicache();

  let rootBackgroundImage = useEntity(
    rootEntity,
    "theme/card-background-image",
  );
  let rootBackgroundRepeat = useEntity(
    rootEntity,
    "theme/card-background-image-repeat",
  );
  let rootBackgroundOpacity = useEntity(
    rootEntity,
    "theme/card-background-image-opacity",
  );

  let pageBackgroundImage =
    useEntity(props.entityID, "theme/card-background-image") ||
    rootBackgroundImage;
  let pageBackgroundImageRepeat =
    useEntity(props.entityID, "theme/card-background-image-repeat") ||
    rootBackgroundRepeat;
  let pageBackgroundImageOpacity =
    useEntity(props.entityID, "theme/card-background-image-opacity") ||
    rootBackgroundOpacity;

  let rootPageBorderHidden = useEntity(rootEntity, "theme/card-border-hidden");
  let entityPageBorderHidden = useEntity(
    props.entityID,
    "theme/card-border-hidden",
  );
  let pageBorderHidden = (entityPageBorderHidden || rootPageBorderHidden)?.data
    .value;

  return (
    <div
      className={
        pageBorderHidden
          ? "py-2 px-0 border border-transparent"
          : `relative rounded-t-lg p-2 shadow-md text-primary border border-border border-b-transparent`
      }
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
                backgroundImage: pageBackgroundImage
                  ? `url(${pageBackgroundImage.data.src})`
                  : undefined,

                backgroundRepeat: pageBackgroundImageRepeat
                  ? "repeat"
                  : "no-repeat",
                opacity: pageBackgroundImageOpacity?.data.value || 1,
                backgroundSize: !pageBackgroundImageRepeat?.data.value
                  ? "cover"
                  : `calc(${pageBackgroundImageRepeat.data.value}px / 2 )`,
              }
        }
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
  );
};
