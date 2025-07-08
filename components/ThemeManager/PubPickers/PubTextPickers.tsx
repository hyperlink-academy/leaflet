import { pickers } from "../ThemeSetter";
import { PageTextPicker } from "../Pickers/PageThemePickers";
import { Color } from "react-aria-components";

export const PagePickers = (props: {
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
      <hr className="border-borer-light" />
      <div className="flex gap-2">
        <div className="w-6 h-6 font-bold text-center rounded-md  bg-border-light">
          Aa
        </div>
        <div className="font-bold">Header</div> <div>iA Writer</div>
      </div>
      <div className="flex gap-2">
        <div className="w-6 h-6 place-items-center text-center rounded-md bg-border-light">
          Aa
        </div>{" "}
        <div className="font-bold">Body</div> <div>iA Writer</div>
      </div>
    </div>
  );
};
