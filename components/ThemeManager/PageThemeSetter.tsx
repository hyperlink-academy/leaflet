import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { pickers, SectionArrow } from "./ThemeSetter";

import { PageThemePickers } from "./PageThemePickers";
import { useState } from "react";
import { theme } from "tailwind.config";
import { ButtonPrimary } from "components/Buttons";
import { PaintSmall } from "components/Icons/PaintSmall";
import { AccentThemePickers } from "./AccentThemePickers";

export const PageThemeSetter = (props: { entityID: string }) => {
  let { rootEntity } = useReplicache();
  let permission = useEntitySetContext().permissions.write;
  let [openPicker, setOpenPicker] = useState<pickers>("null");

  let leafletBGImage = useEntity(rootEntity, "theme/background-image");
  let leafletBGRepeat = useEntity(rootEntity, "theme/background-image-repeat");

  if (!permission) return null;

  return (
    <>
      <div className="pageThemeSetter flex flex-row gap-2 px-3 py-1 ">
        <div className="gap-2 flex font-bold ">
          <PaintSmall /> Theme Page
        </div>
        <ResetButton entityID={props.entityID} />
      </div>
      <div
        className="pageThemeSetterContent bg-bg-leaflet w-80 p-3 pb-0 flex flex-col gap-2 rounded-md -mb-1"
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
        <AccentThemePickers
          entityID={props.entityID}
          openPicker={openPicker}
          setOpenPicker={(pickers) => setOpenPicker(pickers)}
        />
        <div className="flex flex-col -mb-[14px] mt-4 z-10">
          <PageThemePickers
            entityID={props.entityID}
            openPicker={openPicker}
            setOpenPicker={(pickers) => setOpenPicker(pickers)}
          />
          <SectionArrow
            fill={theme.colors["primary"]}
            stroke={theme.colors["bg-page"]}
            className="ml-2"
          />
        </div>
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
  let pageBGImage = useEntity(props.entityID, "theme/card-background-image");
  let pageBGRepeat = useEntity(
    props.entityID,
    "theme/card-background-image-repeat",
  );
  let pageBGOpacity = useEntity(
    props.entityID,
    "theme/card-background-image-opacity",
  );

  return (
    <div
      className="relative rounded-t-lg p-2 shadow-md text-primary border border-border border-b-transparent"
      style={{
        backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
      }}
    >
      <div
        className="background absolute top-0 right-0 bottom-0 left-0 z-0  rounded-t-lg"
        style={{
          backgroundImage: pageBGImage
            ? `url(${pageBGImage.data.src})`
            : undefined,

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
  );
};
