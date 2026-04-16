"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BaseThemeProvider,
  CardBorderHiddenContext,
} from "components/ThemeManager/ThemeProvider";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
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
import { GoToArrow } from "components/Icons/GoToArrow";
import Link from "next/link";

export function ThemeSettingsContent() {
  let toolbarRef = useRef<HTMLDivElement>(null);
  let [previewMode, setPreviewMode] = useState<"post" | "pub">("post");
  let params = useParams<{ did: string; publication: string }>();
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
    changes,
  } = state;

  let settingsHref = `/lish/${params.did}/${params.publication}/dashboard?tab=Settings`;

  let hasUnsavedChanges =
    changes ||
    headingFont !== record?.theme?.headingFont ||
    bodyFont !== record?.theme?.bodyFont ||
    pageWidth !== (record?.theme?.pageWidth || 624) ||
    showPageBackground !== !!record?.theme?.showPageBackground;

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
        <div className="w-full h-screen flex flex-col overflow-hidden">
          {/* Theme Setter Panel */}
          <div
            ref={toolbarRef}
            className="themeSetterControls bg-accent-1 items-center -mb-2 pb-[10px] pt-2 "
          >
            <div className=" sm:w-[var(--page-width-units)] mx-auto flex justify-between items-center px-3 sm:px-4 ">
              <BackToPubButton
                hasUnsavedChanges={hasUnsavedChanges}
                settingsHref={settingsHref}
                localPubTheme={localPubTheme}
                headingFont={headingFont}
                bodyFont={bodyFont}
                image={image}
                pageWidth={pageWidth}
              />
              <div className="flex gap-1 items-center ">
                <ToggleGroup
                  value={previewMode}
                  optionClassName="text-base! py-1! px-2!"
                  onChange={setPreviewMode}
                  options={[
                    { value: "post", label: "Post" },
                    { value: "pub", label: "Pub" },
                  ]}
                />
                <Separator classname="h-8! mr-1" />
                <PubThemePopover state={state} toolbarRef={toolbarRef} />
              </div>
            </div>
          </div>

          {/* Full-page Preview */}
          <PublicationBackgroundProvider
            className="rounded-t-lg grow! min-h-0 overflow-y-auto"
            theme={record?.theme}
            pub_creator={publication?.identity_did || ""}
            localBgImage={pubBGImage}
            localBgImageRepeat={leafletBGRepeat}
          >
            <div
              className="mx-auto h-full w-fit"
              onClickCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
          </PublicationBackgroundProvider>
        </div>
      </BaseThemeProvider>
    </CardBorderHiddenContext.Provider>
  );
}

const BackToPubButton = (props: {
  hasUnsavedChanges: boolean;
  settingsHref: string;
  localPubTheme: ReturnType<typeof usePubThemeEditorState>["localPubTheme"];
  headingFont: ReturnType<typeof usePubThemeEditorState>["headingFont"];
  bodyFont: ReturnType<typeof usePubThemeEditorState>["bodyFont"];
  image: ReturnType<typeof usePubThemeEditorState>["image"];
  pageWidth: ReturnType<typeof usePubThemeEditorState>["pageWidth"];
}) => {
  let router = useRouter();
  let [open, setOpen] = useState(false);
  if (props.hasUnsavedChanges)
    return (
      <Popover
        open={open}
        onOpenChange={setOpen}
        align="start"
        side="bottom"
        className="w-76 !p-0"
        trigger={
          <div className="flex gap-2 items-center font-bold text-accent-2">
            <GoToArrow className="rotate-180 text-accent-2" />
            Back <span className="sm:block hidden">To Settings</span>
          </div>
        }
      >
        <BaseThemeProvider
          local
          {...props.localPubTheme}
          headingFontId={props.headingFont}
          bodyFontId={props.bodyFont}
          hasBackgroundImage={!!props.image}
          pageWidth={props.pageWidth}
        >
          <div className="flex flex-col p-3">
            <h4 className="text-primary">Discard unsaved changes?</h4>
            <p className="text-sm text-tertiary">
              You have unsaved changes to your theme. Leaving the page will lose
              your edits!
            </p>
            <div className="flex gap-4 w-full pt-3">
              <ButtonPrimary
                className="shrink-0"
                onClick={() => router.push(props.settingsHref)}
              >
                Discard and Leave
              </ButtonPrimary>

              <button
                className="text-accent-contrast font-bold"
                onClick={() => setOpen(false)}
              >
                Nevermind
              </button>
            </div>
          </div>
        </BaseThemeProvider>
      </Popover>
    );
  else
    return (
      <Link className="no-underline!" href={props.settingsHref}>
        <div className="flex gap-2 text-accent-2 items-center font-bold">
          <GoToArrow className="rotate-180 text-accent-2" />
          Back <span className="sm:block hidden">To Settings</span>
        </div>
      </Link>
    );
};

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
                    content: "Theme saved!",
                    type: "success",
                  });
                }
              }}
            >
              {loading ? <DotLoader /> : "Save Changes"}
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
