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
  pageBackground: "#FDFCFA",
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
      record={pub?.record as PubLeafletPublication.Record}
    >
      <PublicationBackgroundProvider
        record={pub?.record as PubLeafletPublication.Record}
        pub_creator={pub?.identity_did || ""}
      >
        {props.children}
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
}

export function PublicationBackgroundProvider(props: {
  record?: PubLeafletPublication.Record | null;
  pub_creator: string;
  className?: string;
  children: React.ReactNode;
}) {
  let backgroundImage = props.record?.theme?.backgroundImage?.image?.ref
    ? blobRefToSrc(
        props.record?.theme?.backgroundImage?.image?.ref,
        props.pub_creator,
      )
    : null;

  let backgroundImageRepeat = props.record?.theme?.backgroundImage?.repeat;
  let backgroundImageSize = props.record?.theme?.backgroundImage?.width || 500;
  return (
    <div
      className="PubBackgroundWrapper w-full bg-bg-leaflet text-primary h-full flex flex-col bg-cover bg-center bg-no-repeat items-stretch pwa-padding"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
        backgroundSize: `${backgroundImageRepeat ? `${backgroundImageSize}px` : "cover"}`,
      }}
    >
      {props.children}
    </div>
  );
}
export function PublicationThemeProvider(props: {
  local?: boolean;
  children: React.ReactNode;
  record?: PubLeafletPublication.Record | null;
  pub_creator: string;
}) {
  let colors = usePubTheme(props.record);
  return (
    <BaseThemeProvider local={props.local} {...colors}>
      {props.children}
    </BaseThemeProvider>
  );
}

export const usePubTheme = (record?: PubLeafletPublication.Record | null) => {
  let bgLeaflet = useColor(record, "backgroundColor");
  let bgPage = useColor(record, "pageBackground");
  bgPage = record?.theme?.pageBackground ? bgPage : bgLeaflet;
  let showPageBackground = record?.theme?.showPageBackground;

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
        colorToString(showPageBackground ? bgPage : bgLeaflet, "rgb"),
      ) -
      getColorContrast(
        colorToString(a, "rgb"),
        colorToString(showPageBackground ? bgPage : bgLeaflet, "rgb"),
      )
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
    showPageBackground,
  };
};

export const useLocalPubTheme = (
  record: PubLeafletPublication.Record | undefined,
  showPageBackground?: boolean,
) => {
  const pubTheme = usePubTheme(record);
  const [localOverrides, setTheme] = useState<Partial<typeof pubTheme>>({});

  const mergedTheme = useMemo(() => {
    let newTheme = {
      ...pubTheme,
      ...localOverrides,
      showPageBackground,
    };
    let sortedAccents = [newTheme.accent1, newTheme.accent2].sort((a, b) => {
      return (
        getColorContrast(
          colorToString(b, "rgb"),
          colorToString(
            showPageBackground ? newTheme.bgPage : newTheme.bgLeaflet,
            "rgb",
          ),
        ) -
        getColorContrast(
          colorToString(a, "rgb"),
          colorToString(
            showPageBackground ? newTheme.bgPage : newTheme.bgLeaflet,
            "rgb",
          ),
        )
      );
    });
    return {
      ...newTheme,
      accentContrast: sortedAccents[0],
    };
  }, [pubTheme, localOverrides, showPageBackground]);
  return {
    theme: mergedTheme,
    setTheme,
    changes: Object.keys(localOverrides).length > 0,
  };
};
