"use client";

import { useState } from "react";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { ToggleGroup } from "components/ToggleGroup";
import { PaintSmall } from "components/Icons/PaintSmall";
import { Popover } from "components/Popover";
import {
  usePubThemeEditorState,
  PubThemePickerPanel,
} from "components/ThemeManager/PubThemeSetter";
import { PubPreview } from "./PubPreview";
import { PostPreview } from "./PostPreview";

export function ThemeSettingsContent() {
  let [previewMode, setPreviewMode] = useState<"post" | "pub">("post");
  let [loading, setLoading] = useState(false);

  let state = usePubThemeEditorState();
  let {
    localPubTheme,
    headingFont,
    bodyFont,
    image,
    pageWidth,
    pubBGImage,
    leafletBGRepeat,
    showPageBackground,
    submitTheme,
    toaster,
  } = state;

  return (
    <BaseThemeProvider
      local
      {...localPubTheme}
      headingFontId={headingFont}
      bodyFontId={bodyFont}
      hasBackgroundImage={!!image}
      pageWidth={pageWidth}
    >
      <div className="w-full h-full flex relative overflow-hidden">
        {/* Theme Setter Panel */}
        <div className="absolute top-6 left-6 z-20">
          <Popover
            align="start"
            side="bottom"
            className="sm:w-sm w-full rounded-lg! max-h-full  overflow-y-auto !p-0 bg-white!"
            trigger={
              <button
                type="button"
                className="w-12 h-12 rounded-full bg-accent-1 text-accent-2 data-[state=open]:bg-accent-2 data-[state=open]:text-accent-1 flex items-center justify-center transition-colors cursor-pointer"
              >
                <PaintSmall />
              </button>
            }
            asChild
          >
            <form
              className="flex flex-col"
              onSubmit={async (e) => {
                e.preventDefault();
                let result = await submitTheme(setLoading);
                if (result?.success) {
                  toaster({ content: "Theme updated!", type: "success" });
                }
              }}
            >
              {/* Toggle + Save Header */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <div className="font-bold text-[#272727]">Preview Mode</div>
                <ToggleGroup
                  value={previewMode}
                  optionClassName="text-base!"
                  onChange={setPreviewMode}
                  options={[
                    { value: "post", label: "Post" },
                    { value: "pub", label: "Pub" },
                  ]}
                />
              </div>

              <div className="px-3 pb-3 gap-2 flex flex-col">
                <PubThemePickerPanel state={state} />
              </div>
              <div className="p-3 pt-0!">
                <ButtonPrimary fullWidth type="submit" disabled={loading}>
                  {loading ? <DotLoader /> : "Update"}
                </ButtonPrimary>
              </div>
            </form>
          </Popover>
        </div>

        {/* Full-page Preview */}
        <div
          className="w-full h-full overflow-y-auto"
          style={{
            backgroundImage: pubBGImage ? `url(${pubBGImage})` : undefined,
            backgroundRepeat: leafletBGRepeat ? "repeat" : "no-repeat",
            backgroundPosition: "center",
            backgroundSize: !leafletBGRepeat
              ? "cover"
              : `calc(${leafletBGRepeat}px / 2)`,
          }}
        >
          <div className="w-full h-full bg-bg-leaflet">
            <div
              className="w-full min-h-full"
              style={{
                backgroundImage: pubBGImage ? `url(${pubBGImage})` : undefined,
                backgroundRepeat: leafletBGRepeat ? "repeat" : "no-repeat",
                backgroundPosition: "center",
                backgroundSize: !leafletBGRepeat
                  ? "cover"
                  : `calc(${leafletBGRepeat}px / 2)`,
              }}
            >
              {previewMode === "pub" ? (
                <PubPreview
                  showPageBackground={showPageBackground}
                  pageWidth={pageWidth}
                />
              ) : (
                <PostPreview
                  showPageBackground={showPageBackground}
                  pageWidth={pageWidth}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </BaseThemeProvider>
  );
}
