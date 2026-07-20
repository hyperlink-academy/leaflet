"use client";
import { useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { addImage } from "src/utils/addImage";
import { pickers, setColorAttribute } from "./ThemeSetter";
import { useColorAttribute } from "./useColorAttribute";
import type {
  ImageState,
  PubThemeColorSet,
  PubThemePanelState,
} from "./PubThemeSetter";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "app/(published)/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { resolvePublicationTheme } from "lexicons/src/normalize";
import { themeFacts, themeFactAttributes } from "./themeFacts";

// Pub theme editing state backed by theme/* facts on a publication's draft
// leaflet root; edits persist as draft state and go live on the next publish.
export function useDraftPubThemeState(): PubThemePanelState {
  let [openPicker, setOpenPicker] = useState<pickers>("null");
  let { rep, undoManager, rootEntity } = useReplicache();
  let { data } = usePublicationData();
  let record = useNormalizedPublicationRecord();

  let bgLeaflet = useColorAttribute(rootEntity, "theme/page-background");
  let bgPage = useColorAttribute(rootEntity, "theme/card-background");
  let primary = useColorAttribute(rootEntity, "theme/primary");
  let accent1 = useColorAttribute(rootEntity, "theme/accent-background");
  let accent2 = useColorAttribute(rootEntity, "theme/accent-text");
  let highlight1 = useEntity(rootEntity, "theme/highlight-1")?.data.value;
  let highlight2 = useColorAttribute(rootEntity, "theme/highlight-2");
  let highlight3 = useColorAttribute(rootEntity, "theme/highlight-3");
  let cardBorderHidden = !!useEntity(rootEntity, "theme/card-border-hidden")
    ?.data.value;
  let showPageBackground = !cardBorderHidden;
  let bgImage = useEntity(rootEntity, "theme/background-image");
  let bgImageRepeat = useEntity(rootEntity, "theme/background-image-repeat");
  let pageWidth =
    useEntity(rootEntity, "theme/page-width")?.data.value || 624;
  let headingFont = useEntity(rootEntity, "theme/heading-font")?.data.value;
  let bodyFont = useEntity(rootEntity, "theme/body-font")?.data.value;

  let image: ImageState | null = bgImage
    ? { src: bgImage.data.src, repeat: bgImageRepeat?.data.value ?? null }
    : null;

  let setColor = setColorAttribute(rep, rootEntity);
  let currentColors: PubThemeColorSet = {
    bgLeaflet,
    bgPage,
    primary,
    accent1,
    accent2,
  };
  let colorAttributes = {
    bgLeaflet: "theme/page-background",
    bgPage: "theme/card-background",
    primary: "theme/primary",
    accent1: "theme/accent-background",
    accent2: "theme/accent-text",
  } as const;

  let setTheme: PubThemePanelState["setTheme"] = async (action) => {
    let next = typeof action === "function" ? action(currentColors) : action;
    await undoManager.withUndoGroup(async () => {
      for (let key of Object.keys(
        colorAttributes,
      ) as (keyof typeof colorAttributes)[]) {
        let value = next[key];
        if (value && value !== currentColors[key])
          await setColor(colorAttributes[key])(value);
      }
    });
  };

  let setShowPageBackground = (s: boolean) => {
    rep?.mutate.assertFact({
      entity: rootEntity,
      attribute: "theme/card-border-hidden",
      data: { type: "boolean", value: !s },
    });
  };

  let setImage = async (i: ImageState | null) => {
    if (!rep) return;
    if (i === null) {
      await rep.mutate.retractAttribute({
        entity: rootEntity,
        attribute: ["theme/background-image", "theme/background-image-repeat"],
      });
      return;
    }
    await undoManager.withUndoGroup(async () => {
      if (i.file)
        await addImage(i.file, rep, {
          entityID: rootEntity,
          attribute: "theme/background-image",
        });
      if (i.repeat) {
        await rep.mutate.assertFact({
          entity: rootEntity,
          attribute: "theme/background-image-repeat",
          data: { type: "number", value: i.repeat },
        });
      } else {
        await rep.mutate.retractAttribute({
          entity: rootEntity,
          attribute: "theme/background-image-repeat",
        });
      }
    });
  };

  let setPageWidth = (w: number) => {
    rep?.mutate.assertFact({
      entity: rootEntity,
      attribute: "theme/page-width",
      data: { type: "number", value: w },
    });
  };

  let setFont =
    (attribute: "theme/heading-font" | "theme/body-font") =>
    (f: string | undefined) => {
      if (f === undefined) {
        rep?.mutate.retractAttribute({ entity: rootEntity, attribute });
      } else {
        rep?.mutate.assertFact({
          entity: rootEntity,
          attribute,
          data: { type: "string", value: f },
        });
      }
    };

  let resetTheme = async () => {
    if (!rep) return;
    let facts = themeFacts(
      resolvePublicationTheme(record),
      data?.publication?.identity_did || "",
    );
    // Clear all theme facts and write the defaults as one undo step, matching
    // the other theme setters in this hook.
    await undoManager.withUndoGroup(async () => {
      await rep.mutate.retractAttribute({
        entity: rootEntity,
        attribute: [...themeFactAttributes],
      });
      await Promise.all(
        facts.map((f) =>
          rep.mutate.assertFact({
            entity: rootEntity,
            ...f,
          } as Parameters<typeof rep.mutate.assertFact>[0]),
        ),
      );
    });
  };

  return {
    openPicker,
    setOpenPicker,
    showPageBackground,
    setShowPageBackground,
    localPubTheme: {
      ...currentColors,
      highlight1,
      highlight2,
      highlight3,
      showPageBackground,
      pageWidth,
      headingFontId: headingFont,
      bodyFontId: bodyFont,
    },
    setTheme,
    image,
    setImage,
    pageWidth,
    setPageWidth,
    headingFont,
    setHeadingFont: setFont("theme/heading-font"),
    bodyFont,
    setBodyFont: setFont("theme/body-font"),
    pubBGImage: image?.src ?? null,
    leafletBGRepeat: image?.repeat ?? null,
    resetTheme,
  };
}
