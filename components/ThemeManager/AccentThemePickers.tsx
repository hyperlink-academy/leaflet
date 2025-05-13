"use client";

import { useMemo } from "react";
import { pickers, setColorAttribute } from "./ThemeSetter";
import { ColorPicker } from "./ColorPicker";
import { useReplicache } from "src/replicache";
import { useColorAttribute } from "./useColorAttribute";

export const AccentThemePickers = (props: {
  entityID: string;
  openPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
}) => {
  let { rep } = useReplicache();
  let set = useMemo(() => {
    return setColorAttribute(rep, props.entityID);
  }, [rep, props.entityID]);

  let accent1Value = useColorAttribute(
    props.entityID,
    "theme/accent-background",
  );
  let accent2Value = useColorAttribute(props.entityID, "theme/accent-text");

  return (
    <>
      <div
        className="themeLeafletControls text-accent-2 flex flex-col gap-2 h-full  bg-bg-leaflet p-2 rounded-md border border-accent-2 shadow-[0_0_0_1px_rgb(var(--accent-1))]"
        style={{
          backgroundColor: "rgba(var(--accent-contrast), 0.5)",
        }}
      >
        <ColorPicker
          label="Accent"
          value={accent1Value}
          setValue={set("theme/accent-background")}
          thisPicker={"accent-1"}
          openPicker={props.openPicker}
          setOpenPicker={props.setOpenPicker}
          closePicker={() => props.setOpenPicker("null")}
        />
        <ColorPicker
          label="Text on Accent"
          value={accent2Value}
          setValue={set("theme/accent-text")}
          thisPicker={"accent-2"}
          openPicker={props.openPicker}
          setOpenPicker={props.setOpenPicker}
          closePicker={() => props.setOpenPicker("null")}
        />
      </div>
    </>
  );
};
