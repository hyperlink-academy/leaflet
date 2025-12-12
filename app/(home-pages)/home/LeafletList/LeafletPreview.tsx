"use client";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { useEntity, useReferenceToEntity } from "src/replicache";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { LeafletContent } from "./LeafletContent";
import { Tooltip } from "components/Tooltip";
import { useLeafletPublicationStatus } from "components/PageSWRDataProvider";
import { CSSProperties } from "react";

function useLeafletPreviewData() {
  const pubStatus = useLeafletPublicationStatus();
  const leafletId = pubStatus?.leafletId ?? "";
  const root =
    useReferenceToEntity("root/page", leafletId)[0]?.entity || leafletId;
  const firstPage = useEntity(root, "root/page")[0];
  const page = firstPage?.data.value || root;

  const cardBorderHidden = useEntity(root, "theme/card-border-hidden")?.data
    .value;
  const rootBackgroundImage = useEntity(root, "theme/card-background-image");
  const rootBackgroundRepeat = useEntity(
    root,
    "theme/card-background-image-repeat",
  );
  const rootBackgroundOpacity = useEntity(
    root,
    "theme/card-background-image-opacity",
  );

  const contentWrapperStyle: CSSProperties = cardBorderHidden
    ? {}
    : {
        backgroundImage: rootBackgroundImage
          ? `url(${rootBackgroundImage.data.src}), url(${rootBackgroundImage.data.fallback})`
          : undefined,
        backgroundRepeat: rootBackgroundRepeat ? "repeat" : "no-repeat",
        backgroundPosition: "center",
        backgroundSize: !rootBackgroundRepeat
          ? "cover"
          : rootBackgroundRepeat?.data.value / 3,
        opacity:
          rootBackgroundImage?.data.src && rootBackgroundOpacity
            ? rootBackgroundOpacity.data.value
            : 1,
        backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
      };

  const contentWrapperClass = `leafletContentWrapper h-full sm:w-48 w-40 mx-auto overflow-clip ${!cardBorderHidden && "border border-border-light border-b-0 rounded-t-md"}`;

  return {
    root,
    page,
    cardBorderHidden,
    contentWrapperStyle,
    contentWrapperClass,
  };
}

export const LeafletListPreview = (props: { isVisible: boolean }) => {
  const {
    root,
    page,
    cardBorderHidden,
    contentWrapperStyle,
    contentWrapperClass,
  } = useLeafletPreviewData();

  return (
    <Tooltip
      open={true}
      delayDuration={0}
      side="right"
      trigger={
        <div className="w-12 h-full py-1">
          <div className="rounded-md h-full overflow-hidden">
            <ThemeProvider local entityID={root} className="">
              <ThemeBackgroundProvider entityID={root}>
                <div className="w-full h-full rounded-md p-1 border border-border">
                  <div
                    className={`w-full h-full  rounded-[2px]`}
                    style={
                      cardBorderHidden
                        ? {
                            borderWidth: "2px",
                            borderColor: "rgb(var(--primary))",
                          }
                        : {
                            backgroundColor:
                              "rgba(var(--bg-page), var(--bg-page-alpha))",
                          }
                    }
                  />
                </div>
              </ThemeBackgroundProvider>
            </ThemeProvider>
          </div>
        </div>
      }
      className="p-1!"
    >
      <ThemeProvider local entityID={root} className="rounded-sm">
        <ThemeBackgroundProvider entityID={root}>
          <div className="leafletPreview grow shrink-0 h-44 w-64 px-2 pt-2 sm:px-3 sm:pt-3 flex items-end pointer-events-none rounded-[2px] ">
            <div className={contentWrapperClass} style={contentWrapperStyle}>
              <LeafletContent entityID={page} isOnScreen={props.isVisible} />
            </div>
          </div>
        </ThemeBackgroundProvider>
      </ThemeProvider>
    </Tooltip>
  );
};

export const LeafletGridPreview = (props: { isVisible: boolean }) => {
  const { root, page, contentWrapperStyle, contentWrapperClass } =
    useLeafletPreviewData();

  return (
    <ThemeProvider local entityID={root} className="w-full!">
      <div className="border border-border-light rounded-md w-full h-full overflow-hidden ">
        <div className="w-full h-full">
          <ThemeBackgroundProvider entityID={root}>
            <div
              inert
              className="leafletPreview grow shrink-0 h-full w-full px-2 pt-2 sm:px-3 sm:pt-3 flex items-end pointer-events-none"
            >
              <div className={contentWrapperClass} style={contentWrapperStyle}>
                <LeafletContent entityID={page} isOnScreen={props.isVisible} />
              </div>
            </div>
          </ThemeBackgroundProvider>
        </div>
      </div>
    </ThemeProvider>
  );
};
