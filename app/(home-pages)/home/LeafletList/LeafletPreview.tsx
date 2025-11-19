"use client";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import {
  PermissionToken,
  useEntity,
  useReferenceToEntity,
} from "src/replicache";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { LeafletContent } from "./LeafletContent";
import { Tooltip } from "components/Tooltip";

export const LeafletListPreview = (props: {
  draft?: boolean;
  published?: boolean;
  isVisible: boolean;
  token: PermissionToken;
  leaflet_id: string;
  loggedIn: boolean;
}) => {
  let root =
    useReferenceToEntity("root/page", props.leaflet_id)[0]?.entity ||
    props.leaflet_id;
  let firstPage = useEntity(root, "root/page")[0];
  let page = firstPage?.data.value || root;

  let cardBorderHidden = useCardBorderHidden(root);
  let rootBackgroundImage = useEntity(root, "theme/card-background-image");
  let rootBackgroundRepeat = useEntity(
    root,
    "theme/card-background-image-repeat",
  );
  let rootBackgroundOpacity = useEntity(
    root,
    "theme/card-background-image-opacity",
  );

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
            <div
              className={`leafletContentWrapper h-full sm:w-48 w-40 mx-auto overflow-clip ${!cardBorderHidden && "border border-border-light border-b-0 rounded-t-md"}`}
              style={
                cardBorderHidden
                  ? {}
                  : {
                      backgroundImage: rootBackgroundImage
                        ? `url(${rootBackgroundImage.data.src}), url(${rootBackgroundImage.data.fallback})`
                        : undefined,
                      backgroundRepeat: rootBackgroundRepeat
                        ? "repeat"
                        : "no-repeat",
                      backgroundPosition: "center",
                      backgroundSize: !rootBackgroundRepeat
                        ? "cover"
                        : rootBackgroundRepeat?.data.value / 3,
                      opacity:
                        rootBackgroundImage?.data.src && rootBackgroundOpacity
                          ? rootBackgroundOpacity.data.value
                          : 1,
                      backgroundColor:
                        "rgba(var(--bg-page), var(--bg-page-alpha))",
                    }
              }
            >
              <LeafletContent entityID={page} isOnScreen={props.isVisible} />
            </div>
          </div>
        </ThemeBackgroundProvider>
      </ThemeProvider>
    </Tooltip>
  );
};

export const LeafletGridPreview = (props: {
  draft?: boolean;
  published?: boolean;
  token: PermissionToken;
  leaflet_id: string;
  loggedIn: boolean;
  isVisible: boolean;
}) => {
  let root =
    useReferenceToEntity("root/page", props.leaflet_id)[0]?.entity ||
    props.leaflet_id;
  let firstPage = useEntity(root, "root/page")[0];
  let page = firstPage?.data.value || root;

  let cardBorderHidden = useCardBorderHidden(root);
  let rootBackgroundImage = useEntity(root, "theme/card-background-image");
  let rootBackgroundRepeat = useEntity(
    root,
    "theme/card-background-image-repeat",
  );
  let rootBackgroundOpacity = useEntity(
    root,
    "theme/card-background-image-opacity",
  );
  return (
    <ThemeProvider local entityID={root} className="w-full!">
      <div className="border border-border-light rounded-md w-full h-full overflow-hidden relative">
        <div className="relative w-full h-full">
          <ThemeBackgroundProvider entityID={root}>
            <div
              inert
              className="leafletPreview relative grow shrink-0 h-full w-full px-2 pt-2 sm:px-3 sm:pt-3 flex items-end pointer-events-none"
            >
              <div
                className={`leafletContentWrapper h-full sm:w-48 w-40 mx-auto overflow-clip ${!cardBorderHidden && "border border-border-light border-b-0 rounded-t-md"}`}
                style={
                  cardBorderHidden
                    ? {}
                    : {
                        backgroundImage: rootBackgroundImage
                          ? `url(${rootBackgroundImage.data.src}), url(${rootBackgroundImage.data.fallback})`
                          : undefined,
                        backgroundRepeat: rootBackgroundRepeat
                          ? "repeat"
                          : "no-repeat",
                        backgroundPosition: "center",
                        backgroundSize: !rootBackgroundRepeat
                          ? "cover"
                          : rootBackgroundRepeat?.data.value / 3,
                        opacity:
                          rootBackgroundImage?.data.src && rootBackgroundOpacity
                            ? rootBackgroundOpacity.data.value
                            : 1,
                        backgroundColor:
                          "rgba(var(--bg-page), var(--bg-page-alpha))",
                      }
                }
              >
                <LeafletContent entityID={page} isOnScreen={props.isVisible} />
              </div>
            </div>
          </ThemeBackgroundProvider>
        </div>
      </div>
    </ThemeProvider>
  );
};
