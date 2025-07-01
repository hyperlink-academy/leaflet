"use client";
import { useMemo, useState } from "react";
import { parseColor } from "react-aria-components";
import { useEntity } from "src/replicache";
import { getColorContrast } from "./ThemeProvider";
import { useColorAttribute, colorToString } from "./useColorAttribute";
import { BaseThemeProvider } from "./ThemeProvider";
import { PubLeafletPublication, PubLeafletThemeColor } from "lexicons/api";
import { usePublicationData } from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";

const PubThemeDefaults = {
  background: "#FDFCFA",
  page: "#FFFFFF",
  primary: "#272727",
  accentText: "#FFFFFF",
  accentBackground: "#0000FF",
};
function parseThemeColor(
  c: PubLeafletThemeColor.Rgb | PubLeafletThemeColor.Rgba,
) {
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
}) {
  let colors = usePubTheme(props.record);

  return (
    <BaseThemeProvider local={props.local} {...colors}>
      {props.children}
    </BaseThemeProvider>
  );
}

export const usePubTheme = (record?: PubLeafletPublication.Record | null) => {
  let bgLeaflet = useColor(record, "background");
  let bgPage = useColor(record, "page");
  let primary = useColor(record, "primary");

  let accent1 = useColor(record, "accentBackground");
  let accent2 = useColor(record, "accentText");

  let highlight1 = useEntity(null, "theme/highlight-1")?.data.value;
  let highlight2 = useColorAttribute(null, "theme/highlight-2");
  let highlight3 = useColorAttribute(null, "theme/highlight-3");

  // set accent contrast to the accent color that has the highest contrast with the page background
  let accentContrast = [accent1, accent2].sort((a, b) => {
    return (
      getColorContrast(colorToString(b, "rgb"), colorToString(bgPage, "rgb")) -
      getColorContrast(colorToString(a, "rgb"), colorToString(bgPage, "rgb"))
    );
  })[0];
  return {
    bgLeaflet,
    bgPage,
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
