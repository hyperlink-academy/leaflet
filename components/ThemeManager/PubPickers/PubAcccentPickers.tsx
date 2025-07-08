import { pickers } from "../ThemeSetter";
import { Color } from "react-aria-components";
import { ColorPicker } from "../Pickers/ColorPicker";

export const PubAccentPickers = (props: {
  accent1: Color;
  accent2: Color;
  setAccent1: (color: Color) => void;
  setAccent2: (color: Color) => void;
  openPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
}) => {
  return (
    <>
      <div
        className="themeLeafletControls text-accent-2 flex flex-col gap-2 h-full  bg-bg-leaflet p-2 rounded-md border border-accent-2 shadow-[0_0_0_1px_rgb(var(--accent-1))]"
        style={{
          backgroundColor: "rgba(var(--accent-1), 0.5)",
        }}
      >
        <ColorPicker
          label="Accent"
          value={props.accent1}
          setValue={props.setAccent1}
          thisPicker={"accent-1"}
          openPicker={props.openPicker}
          setOpenPicker={props.setOpenPicker}
          closePicker={() => props.setOpenPicker("null")}
        />
        <ColorPicker
          label="Text on Accent"
          value={props.accent2}
          setValue={props.setAccent2}
          thisPicker={"accent-2"}
          openPicker={props.openPicker}
          setOpenPicker={props.setOpenPicker}
          closePicker={() => props.setOpenPicker("null")}
        />
      </div>
    </>
  );
};
