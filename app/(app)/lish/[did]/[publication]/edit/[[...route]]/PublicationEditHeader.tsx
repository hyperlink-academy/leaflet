"use client";
import { useState } from "react";
import { SpeedyLink } from "components/SpeedyLink";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { publishPublicationPages } from "actions/publishPublicationPages";
import { useToaster } from "components/Toast";
import { OAuthErrorMessage, isOAuthSessionError } from "components/OAuthError";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../../dashboard/PublicationSWRProvider";
import { DotLoader } from "components/utils/DotLoader";
import { Popover } from "components/Popover";
import { PaintSmall } from "components/Icons/PaintSmall";
import { ButtonPrimary } from "components/Buttons";
import {
  BaseThemeProvider,
  CardBorderHiddenContext,
} from "components/ThemeManager/ThemeProvider";
import {
  PubThemePickerPanel,
  type PubThemeEditorState,
} from "components/ThemeManager/PubThemeSetter";
import { usePubEditThemeState } from "./PublicationEditThemeProvider";

type Status = "idle" | "publishing" | "success";

export function PublicationEditHeader(props: {
  did: string;
  publicationName: string;
}) {
  let { data, mutate } = usePublicationData();
  let publicationUri = data?.publication?.uri;
  let publicationUrl = useNormalizedPublicationRecord()?.url;
  let [status, setStatus] = useState<Status>("idle");
  let toaster = useToaster();
  let themeState = usePubEditThemeState();

  let dashboardHref = `/lish/${props.did}/${props.publicationName}/dashboard`;

  async function handlePublish() {
    if (!publicationUri || status === "publishing") return;
    setStatus("publishing");
    try {
      const result = await publishPublicationPages({
        publication_uri: publicationUri,
      });
      if (result.success) {
        setStatus("success");
        mutate();
        setTimeout(() => setStatus("idle"), 2000);
        toaster({
          type: "success",
          content: (
            <span>
              Updated!{" "}
              {publicationUrl && (
                <a
                  href={publicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-accent-2!"
                >
                  View it here
                </a>
              )}
            </span>
          ),
        });
      } else {
        setStatus("idle");
        toaster({
          type: "error",
          content: isOAuthSessionError(result.error) ? (
            <OAuthErrorMessage error={result.error} />
          ) : (
            result.error.message
          ),
        });
      }
    } catch (e) {
      setStatus("idle");
      toaster({
        type: "error",
        content: e instanceof Error ? e.message : "Failed to publish",
      });
    }
  }

  let label =
    status === "publishing" ? (
      <DotLoader className="h-[21px]!" />
    ) : status === "success" ? (
      "Published!"
    ) : (
      <div className="flex gap-[6px]">
        Update<span className="sm:block hidden "> Publication</span>
      </div>
    );

  return (
    <div className="publicationEditHeader bg-accent-1 text-accent-2 px-4 pt-4 pb-2 flex items-center justify-between gap-2 shrink-0">
      <SpeedyLink
        href={dashboardHref}
        className="flex flex-col text-accent-2 hover:no-underline! leading-none"
        aria-label="Back to dashboard "
      >
        <div className="flex items-center gap-1  font-bold text-sm">
          <GoToArrowLined className="rotate-180" />
          Back <span className="sm:block hidden">to Dashboard</span>
        </div>
        <div className="pl-5 text-xs">Draft autosaves</div>
      </SpeedyLink>
      <div className="flex items-center gap-2 shrink-0">
        <PubThemePopover state={themeState} />
        <button
          type="button"
          onClick={handlePublish}
          className="bg-accent-2 text-accent-1 font-bold px-3 py-1 rounded-md text-sm shrink-0 disabled:opacity-60"
        >
          {label}
        </button>
      </div>
    </div>
  );
}

const PubThemePopover = ({ state }: { state: PubThemeEditorState }) => {
  let {
    localPubTheme,
    headingFont,
    bodyFont,
    image,
    pageWidth,
    submitTheme,
    showPageBackground,
    toaster,
  } = state;
  let [loading, setLoading] = useState(false);

  return (
    <Popover
      align="end"
      side="bottom"
      arrowFill="white"
      border="#CCCCCC"
      className="sm:w-sm w-[1000px] rounded-lg! !p-0 bg-white! border-[#CCCCCC]!"
      trigger={
        <button
          type="button"
          className="w-7 h-7 rounded-md bg-accent-1 text-accent-2 data-[state=open]:bg-accent-2 data-[state=open]:text-accent-1 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Edit theme"
        >
          <PaintSmall />
        </button>
      }
      asChild
    >
      <CardBorderHiddenContext.Provider value={!showPageBackground}>
        <BaseThemeProvider
          local
          {...localPubTheme}
          headingFontId={headingFont}
          bodyFontId={bodyFont}
          hasBackgroundImage={!!image}
          pageWidth={pageWidth}
        >
          <div className="flex flex-col overflow-y-auto max-h-(--radix-popover-content-available-height) py-3">
            <div className="p-3 pt-0">
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
      </CardBorderHiddenContext.Provider>
    </Popover>
  );
};
