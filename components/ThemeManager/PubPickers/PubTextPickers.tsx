import { pickers } from "../ThemeSetter";
import { FontPicker, PageTextPicker } from "../Pickers/TextPickers";
import { Color } from "react-aria-components";

export const PubTextPickers = (props: {
  primary: Color;
  pageBackground: Color;
  setPrimary: (color: Color) => void;
  setPageBackground: (color: Color) => void;
  openPicker: pickers;
  setOpenPicker: (thisPicker: pickers) => void;
  hasPageBackground: boolean;
}) => {
  return (
    <div
      className="themeLeafletControls text-primary flex flex-col gap-2 h-full  bg-bg-page p-2 rounded-md border border-primary shadow-[0_0_0_1px_rgb(var(--bg-page))]"
      style={{
        backgroundColor: props.hasPageBackground
          ? "rgba(var(--bg-page), var(--bg-page-alpha))"
          : "transparent",
      }}
    >
      <PageTextPicker
        value={props.primary}
        setValue={props.setPrimary}
        openPicker={props.openPicker}
        setOpenPicker={props.setOpenPicker}
      />
      <FontPicker label="Heading" />
      <FontPicker label="Body" />
    </div>
  );
};
