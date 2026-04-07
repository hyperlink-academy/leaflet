"use client";

import { useRef, useState } from "react";
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
import { Separator } from "components/Layout";

export function ThemeSettingsContent() {
  let toolbarRef = useRef<HTMLDivElement>(null);
  let [previewMode, setPreviewMode] = useState<"post" | "pub">("post");
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
          <div
            ref={toolbarRef}
            className="absolute sm:top-6 sm:left-6 top-4 right-4 z-20 flex gap-1 bg-accent-1 w-fit p-1 pl-2 rounded-md items-center"
          >
            <PubThemePopover state={state} toolbarRef={toolbarRef} />
            <Separator classname="h-8! ml-1" />
            <ToggleGroup
              value={previewMode}
              optionClassName="text-base! py-1! px-2!"
              onChange={setPreviewMode}
              options={[
                { value: "post", label: "Post" },
                { value: "pub", label: "Pub" },
              ]}
            />
          </div>

          {/* Full-page Preview */}
          <PublicationBackgroundProvider
            theme={record?.theme}
            pub_creator={publication?.identity_did || ""}
            localBgImage={pubBGImage}
            localBgImageRepeat={leafletBGRepeat}
          >
            <div className="mx-auto h-full w-fit pointer-events-none">
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

const PubThemePopover = ({
  state,
  toolbarRef,
}: {
  state: ReturnType<typeof usePubThemeEditorState>;
  toolbarRef: React.RefObject<HTMLDivElement | null>;
}) => {
  let {
    localPubTheme,
    headingFont,
    bodyFont,
    image,
    pageWidth,
    submitTheme,
    toaster,
  } = state;
  let [loading, setLoading] = useState(false);

  return (
    <Popover
      defaultOpen
      align="start"
      side="bottom"
      arrowFill="white"
      border="#CCCCCC"
      onInteractOutside={(e) => {
        if (
          toolbarRef.current &&
          e.target instanceof Node &&
          toolbarRef.current.contains(e.target)
        ) {
          e.preventDefault();
        }
      }}
      className="sm:w-sm w-[1000px] rounded-lg! !p-0 bg-white! border-[#CCCCCC]!"
      trigger={
        <button
          type="button"
          className="w-8 h-8 rounded-md bg-accent-1 text-accent-2 data-[state=open]:bg-accent-2 data-[state=open]:text-accent-1 flex items-center justify-center transition-colors cursor-pointer "
        >
          <PaintSmall />
        </button>
      }
      asChild
    >
      <BaseThemeProvider
        local
        {...localPubTheme}
        headingFontId={headingFont}
        bodyFontId={bodyFont}
        hasBackgroundImage={!!image}
        pageWidth={pageWidth}
      >
        <div className="flex flex-col overflow-y-auto max-h-(--radix-popover-content-available-height) py-3">
          {/* Toggle + Save Header */}

          <div className="p-3 pt-0 ">
            <ButtonPrimary
              fullWidth
              type="button"
              disabled={loading}
              onClick={async () => {
                let result = await submitTheme(setLoading);
                if (result?.success) {
                  toaster({
                    content: "Theme updated!",
                    type: "success",
                  });
                }
              }}
            >
              {loading ? <DotLoader /> : "Update"}
            </ButtonPrimary>
          </div>

          <div className="px-3 gap-2 flex flex-col">
            <PubThemePickerPanel state={state} />
          </div>
        </div>
      </BaseThemeProvider>
    </Popover>
  );
};
