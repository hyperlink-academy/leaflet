"use client";

import { useState } from "react";
import {
  BaseThemeProvider,
  CardBorderHiddenContext,
} from "components/ThemeManager/ThemeProvider";
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
import { PublicationBackgroundProvider } from "components/ThemeManager/PublicationThemeProvider";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../dashboard/PublicationSWRProvider";

export function ThemeSettingsContent() {
  let [previewMode, setPreviewMode] = useState<"post" | "pub">("post");
  let [loading, setLoading] = useState(false);
  let { data } = usePublicationData();
  let { publication } = data || {};
  let record = useNormalizedPublicationRecord();
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
    <CardBorderHiddenContext.Provider value={!showPageBackground}>
      <BaseThemeProvider
        local
        {...localPubTheme}
        headingFontId={headingFont}
        bodyFontId={bodyFont}
        hasBackgroundImage={!!image}
        pageWidth={pageWidth}
      >
        <div className="w-full h-screen flex relative overflow-hidden">
          {/* Theme Setter Panel */}
          <div className="absolute sm:top-6 sm:left-6 top-4 right-4 z-20">
            <Popover
              align="start"
              side="bottom"
              arrowFill="white"
              border="#CCCCCC"
              className="sm:w-sm w-[1000px] rounded-lg! !p-0 bg-white! border-[#CCCCCC]!"
              trigger={
                <button
                  type="button"
                  className="w-12 h-12 rounded-full bg-accent-1 text-accent-2 data-[state=open]:bg-accent-2 data-[state=open]:text-accent-1 data-[state=open]:border-accent-1 flex items-center justify-center transition-colors cursor-pointer border-2 border-acccent-2"
                >
                  <PaintSmall />
                </button>
              }
              asChild
            >
              <form
                className="flex flex-col overflow-y-auto max-h-(--radix-popover-content-available-height)"
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
          <PublicationBackgroundProvider
            theme={record?.theme}
            pub_creator={publication?.identity_did || ""}
            localBgImage={pubBGImage}
            localBgImageRepeat={leafletBGRepeat}
          >
            <div className="mx-auto h-full w-fit">
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
          </PublicationBackgroundProvider>
        </div>
      </BaseThemeProvider>
    </CardBorderHiddenContext.Provider>
  );
}
