"use client";
import { useMemo, useState } from "react";
import { parseColor } from "react-aria-components";
import { useEntity } from "src/replicache";
import { getColorContrast } from "./ThemeProvider";
import { useColorAttribute, colorToString } from "./useColorAttribute";
import { BaseThemeProvider } from "./ThemeProvider";
import { PubLeafletPublication, PubLeafletThemeColor } from "lexicons/api";
import { usePublicationData } from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

const PubThemeDefaults = {
  backgroundColor: "#FDFCFA",
  primary: "#272727",
  accentText: "#FFFFFF",
  accentBackground: "#0000FF",
};
function parseThemeColor(
  c: PubLeafletThemeColor.Rgb | PubLeafletThemeColor.Rgba,
) {
  if (c.$type === "pub.leaflet.theme.color#rgba") {
    return parseColor(`rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 100})`);
  }
  return parseColor(`rgb(${c.r}, ${c.g}, ${c.b})`);
}

let useColor = (
  record: PubLeafletPublication.Record | null | undefined,
  c: keyof typeof PubThemeDefaults,
) => {
  return useMemo(() => {
    let v = record?.theme?.[c];
    if (isColor(v)) {
      return parseThemeColor(v);
    } else return parseColor(PubThemeDefaults[c]);
  }, [record?.theme?.[c]]);
};
let isColor = (
  c: any,
): c is PubLeafletThemeColor.Rgb | PubLeafletThemeColor.Rgba => {
  return (
    c?.$type === "pub.leaflet.theme.color#rgb" ||
    c?.$type === "pub.leaflet.theme.color#rgba"
  );
};

export function PublicationThemeProviderDashboard(props: {
  children: React.ReactNode;
  record?: PubLeafletPublication.Record | null;
}) {
  let { data: pub } = usePublicationData();
  return (
    <PublicationThemeProvider
      pub_creator={pub?.identity_did || ""}
      local={true}
      record={pub?.record as PubLeafletPublication.Record}
    >
      {props.children}
    </PublicationThemeProvider>
  );
}
export function PublicationThemeProvider(props: {
  local?: boolean;
  children: React.ReactNode;
  record?: PubLeafletPublication.Record | null;
  pub_creator: string;
  className?: string;
}) {
  let colors = usePubTheme(props.record);

  let backgroundImage = props.record?.theme?.backgroundImage?.image?.ref
    ? blobRefToSrc(
        props.record?.theme?.backgroundImage?.image?.ref,
        props.pub_creator,
      )
    : null;

  let backgroundImageRepeat = props.record?.theme?.backgroundImage?.repeat;
  let backgroundImageSize = props.record?.theme?.backgroundImage?.width || 500;
  return (
    <BaseThemeProvider local={props.local} {...colors}>
      <div
        className={`backgroundWrapper w-screen h-full flex place-items-center bg-bg-page pwa-padding ${props.className}`}
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: `${backgroundImageRepeat ? `${backgroundImageSize}px` : "cover"}`,
        }}
      >
        {props.children}
      </div>
    </BaseThemeProvider>
  );
}

export const usePubTheme = (record?: PubLeafletPublication.Record | null) => {
  let bgLeaflet = useColor(record, "backgroundColor");
  let primary = useColor(record, "primary");

  let accent1 = useColor(record, "accentBackground");
  let accent2 = useColor(record, "accentText");

  let highlight1 = useEntity(null, "theme/highlight-1")?.data.value;
  let highlight2 = useColorAttribute(null, "theme/highlight-2");
  let highlight3 = useColorAttribute(null, "theme/highlight-3");

  // set accent contrast to the accent color that has the highest contrast with the page background
  let accentContrast = [accent1, accent2].sort((a, b) => {
    return (
      getColorContrast(
        colorToString(b, "rgb"),
        colorToString(bgLeaflet, "rgb"),
      ) -
      getColorContrast(colorToString(a, "rgb"), colorToString(bgLeaflet, "rgb"))
    );
  })[0];
  return {
    bgLeaflet,
    //For now we have a single color we use for both background, or if there's a background image, containers
    bgPage: bgLeaflet,
    primary,
    accent1,
    accent2,
    highlight1,
    highlight2,
    highlight3,
    accentContrast,
  };
};

export const useLocalPubTheme = (
  record: PubLeafletPublication.Record | undefined,
) => {
  const pubTheme = usePubTheme(record);
  const [localOverrides, setTheme] = useState<Partial<typeof pubTheme>>({});

  const mergedTheme = useMemo(() => {
    return { ...pubTheme, ...localOverrides };
  }, [pubTheme, localOverrides]);

  return {
    theme: mergedTheme,
    setTheme,
  };
};
