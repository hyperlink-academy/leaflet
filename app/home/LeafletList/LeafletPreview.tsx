"use client";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { useState } from "react";
import {
  PermissionToken,
  useEntity,
  useReferenceToEntity,
} from "src/replicache";
import { theme } from "tailwind.config";
import { useTemplateState } from "../Actions/CreateNewButton";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { PopoverArrow } from "components/Icons/PopoverArrow";
import { LeafletContent } from "./LeafletContent";
import Link from "next/link";

export const LeafletListPreview = (props: {
  draft?: boolean;
  published?: boolean;
  index: number;
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
    <div className="w-4">
      <ThemeProvider local entityID={root} className="!w-full">
        <div className="border border-border-light rounded-md w-4 h-full overflow-hidden">
          <ThemeBackgroundProvider entityID={root}>
            <RadixTooltip.Provider>
              <RadixTooltip.Root>
                <RadixTooltip.Trigger>
                  <div className="w-4 h-full bg-test rounded-md p-1">
                    <div className="w-full h-full bg-bg-page rounded-[2px]" />
                  </div>
                </RadixTooltip.Trigger>
                <RadixTooltip.Portal>
                  <RadixTooltip.Content>
                    hello
                    <RadixTooltip.Arrow
                      asChild
                      width={16}
                      height={8}
                      viewBox="0 0 16 8"
                    >
                      <PopoverArrow
                        arrowFill={theme.colors["border"]}
                        arrowStroke="transparent"
                      />
                    </RadixTooltip.Arrow>
                  </RadixTooltip.Content>
                </RadixTooltip.Portal>
              </RadixTooltip.Root>

              {/*<div className="leafletPreview grow shrink-0 h-full w-full px-2 pt-2 sm:px-3 sm:pt-3 flex items-end pointer-events-none">
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
                            rootBackgroundImage?.data.src &&
                            rootBackgroundOpacity
                              ? rootBackgroundOpacity.data.value
                              : 1,
                          backgroundColor:
                            "rgba(var(--bg-page), var(--bg-page-alpha))",
                        }
                  }
                >
                  <LeafletContent entityID={page} index={props.index} />
                </div>
              </div>*/}
            </RadixTooltip.Provider>
          </ThemeBackgroundProvider>
          <LeafletPreviewLink id={props.token.id} />
        </div>
      </ThemeProvider>
    </div>
  );
};

export const LeafletGridPreview = (props: {
  draft?: boolean;
  published?: boolean;
  index: number;
  token: PermissionToken;
  leaflet_id: string;
  loggedIn: boolean;
}) => {
  let isTemplate = useTemplateState(
    (s) => !!s.templates.find((t) => t.id === props.token.id),
  );
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
    <ThemeProvider local entityID={root} className="!w-full">
      <div className="border border-border-light rounded-md w-full h-full overflow-hidden">
        <div className="relative w-full h-full">
          <ThemeBackgroundProvider entityID={root}>
            <div className="leafletPreview grow shrink-0 h-full w-full px-2 pt-2 sm:px-3 sm:pt-3 flex items-end pointer-events-none">
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
                <LeafletContent entityID={page} index={props.index} />
              </div>
            </div>
          </ThemeBackgroundProvider>
          <LeafletPreviewLink id={props.token.id} />
        </div>
      </div>
    </ThemeProvider>
  );
};

const LeafletPreviewLink = (props: { id: string }) => {
  let [prefetch, setPrefetch] = useState(false);
  return (
    <Link
      onMouseEnter={() => setPrefetch(true)}
      onPointerDown={() => setPrefetch(true)}
      prefetch={prefetch}
      href={`/${props.id}`}
      className={`no-underline sm:hover:no-underline text-primary absolute inset-0 w-full h-full`}
    />
  );
};
