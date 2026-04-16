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
    bgLeaflet: "#FDFCFA",
    bgPage: "#FDFCFA",
    showPageBackground: false,
    primary: "#272727",
    accent1: "#57822B",
    accent2: "#FFFFFF",
    headingFont: undefined,
    bodyFont: undefined,
    pageWidth: 624,
  },
  {
    name: "Minimal",
    bgLeaflet: "#F0F2F2",
    bgPage: "#F0F2F2",
    showPageBackground: false,
    primary: "#292929",
    accent1: "#292929",
    accent2: "#F0F2F2",
    headingFont: undefined,
    bodyFont: "source-sans",
    pageWidth: 768,
  },
  {
    name: "Bookish",
    bgLeaflet: "#FFFBEB",
    bgPage: "#FFFBEB",
    showPageBackground: false,
    primary: "#3B3131",
    accent1: "#B50000",
    accent2: "#F0F2F2",
    headingFont: "lora",
    bodyFont: "lora",
    pageWidth: 768,
  },
  {
    name: "Dark",
    bgLeaflet: "#1A1917",
    bgPage: "#1A1917",
    showPageBackground: false,
    primary: "#FFFFFF",
    accent1: "#234D26",
    accent2: "#C3D6BC",
    headingFont: undefined,
    bodyFont: undefined,
    pageWidth: 768,
  },
  {
    name: "Colorful",
    bgLeaflet: "#2665C9",
    bgPage: "rgba(247, 223, 124, 1)",
    showPageBackground: true,
    primary: "#363131",
    accent1: "#ED3700",
    accent2: "#FFFFFF",
    headingFont: undefined,
    bodyFont: undefined,
    pageWidth: 768,
  },
  {
    name: "Rose",
    bgLeaflet: "#FAD2D7",
    bgPage: "rgba(252, 246, 245, 0.68)",
    showPageBackground: true,
    primary: "#613E3E",
    accent1: "#74C200",
    accent2: "#FFFFFF",
    headingFont: "montserrat",
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
      <div className="flex gap-2   items-center px-2 py-2 border border-[#CCCCCC] rounded-md bg-white mb-1">
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
