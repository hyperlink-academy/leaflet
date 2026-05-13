import { useCallback } from "react";
import { parseColor } from "react-aria-components";
import { PubThemeEditorState } from "../PubThemeSetter";

type PresetTheme = {
  name: string;
  bgLeaflet: string;
  bgPage: string;
  showPageBackground: boolean;
  primary: string;
  accent1: string;
  accent2: string;
  headingFont: string | undefined;
  bodyFont: string | undefined;
  pageWidth: number;
};

const presetThemes: PresetTheme[] = [
  {
    name: "Default",
    bgLeaflet: "#FFFEFC",
    bgPage: "#FDFCFA",
    showPageBackground: false,
    primary: "#272727",
    accent1: "#57821E",
    accent2: "#FFFFFF",
    headingFont: undefined,
    bodyFont: undefined,
    pageWidth: 624,
  },
  {
    name: "Minimal",
    bgLeaflet: "#FCFCFC",
    bgPage: "#FCFCFC",
    showPageBackground: false,
    primary: "#292929",
    accent1: "#292929",
    accent2: "#F0F2F2",
    headingFont: "source-sans",
    bodyFont: "source-sans",
    pageWidth: 768,
  },
  {
    name: "Bookish",
    bgLeaflet: "#FFFBED",
    bgPage: "#FFFBED",
    showPageBackground: false,
    primary: "#3B3131",
    accent1: "#B50000",
    accent2: "#FFFBED",
    headingFont: "lora",
    bodyFont: "lora",
    pageWidth: 768,
  },
  {
    name: "Colorful",
    bgLeaflet: "#2665C9",
    bgPage: "#FFF099",
    showPageBackground: true,
    primary: "#363131",
    accent1: "#CF2D00",
    accent2: "#FFFFFF",
    headingFont: "sometype-mono",
    bodyFont: "atkinson-hyperlegible",
    pageWidth: 768,
  },
  {
    name: "Rose",
    bgLeaflet: "#FAD2D7",
    bgPage: "rgba(255, 246, 245, 0.8)",
    showPageBackground: true,
    primary: "#633333",
    accent1: "#C90065",
    accent2: "#FFFFFF",
    headingFont: "montserrat",
    bodyFont: "montserrat",
    pageWidth: 768,
  },
  {
    name: "Mocha",
    bgLeaflet: "#613600",
    bgPage: "#783E00",
    showPageBackground: false,
    primary: "#FFC987",
    accent1: "#9E4A00",
    accent2: "#FFDCC4",
    headingFont: "source-sans",
    bodyFont: "lora",
    pageWidth: 768,
  },
  {
    name: "Sunset",
    bgLeaflet: "#4A0969",
    bgPage: "rgba(173, 23, 136, 0.75)",
    showPageBackground: false,
    primary: "#FF995E",
    accent1: "#80006C",
    accent2: "#FF54A4",
    headingFont: "montserrat",
    bodyFont: "lora",
    pageWidth: 768,
  },
  {
    name: "Aqua",
    bgLeaflet: "#38F5FF",
    bgPage: "rgba(240, 255, 255, 0.9)",
    showPageBackground: true,
    primary: "#006AE3",
    accent1: "#0076BF",
    accent2: "#F5FFFE",
    headingFont: "sometype-mono",
    bodyFont: "sometype-mono",
    pageWidth: 768,
  },
  {
    name: "Noir",
    bgLeaflet: "#1A1818",
    bgPage: "#1A1818",
    showPageBackground: false,
    primary: "#DBDBDB",
    accent1: "#DEAA00",
    accent2: "#1A1818",
    headingFont: undefined,
    bodyFont: undefined,
    pageWidth: 768,
  },
];

export function PresetThemePicker(props: { state: PubThemeEditorState }) {
  let {
    setTheme,
    setImage,
    setPageWidth,
    setHeadingFont,
    setBodyFont,
    setShowPageBackground,
  } = props.state;

  let applyPreset = useCallback(
    (preset: PresetTheme) => {
      setTheme(() => ({
        bgLeaflet: parseColor(preset.bgLeaflet),
        bgPage: parseColor(preset.bgPage),
        primary: parseColor(preset.primary),
        accent1: parseColor(preset.accent1),
        accent2: parseColor(preset.accent2),
      }));
      setShowPageBackground(preset.showPageBackground);
      setPageWidth(preset.pageWidth);
      setHeadingFont(preset.headingFont);
      setBodyFont(preset.bodyFont);
      setImage(null);
    },
    [
      setTheme,
      setShowPageBackground,
      setPageWidth,
      setHeadingFont,
      setBodyFont,
      setImage,
    ],
  );

  return (
    <div className="pubPresetPicker flex flex-col pb-2">
      <div className="text-sm  text-[#969696] -mb-0.5">PRESETS</div>
      <div className="flex gap-1.5 items-center px-2 py-2 border border-[#CCCCCC] rounded-md bg-white mb-1">
        {presetThemes.map((preset) => (
          <button
            key={preset.name}
            type="button"
            title={preset.name}
            onClick={() => applyPreset(preset)}
            className="w-8 h-8 rounded-full border border-[#CCCCCC] shrink-0 overflow-hidden outline-offset-1 outline-transparent hover:outline-[#CCCCCC] outline-2"
            style={{
              background: `linear-gradient(135deg, ${preset.bgLeaflet} 50%, ${preset.accent1} 50%)`,
            }}
          >
            <span className="sr-only">{preset.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
