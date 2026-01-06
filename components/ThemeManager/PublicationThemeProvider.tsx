"use client";
import { useMemo, useState } from "react";
import { parseColor } from "react-aria-components";
import { useEntity } from "src/replicache";
import { getColorContrast } from "./themeUtils";
import { useColorAttribute, colorToString } from "./useColorAttribute";
import { BaseThemeProvider, CardBorderHiddenContext } from "./ThemeProvider";
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

// Default page background for standalone leaflets (matches editor default)
const StandalonePageBackground = "#FFFFFF";
function parseThemeColor(
  c: PubLeafletThemeColor.Rgb | PubLeafletThemeColor.Rgba,
) {
  if (c.$type === "pub.leaflet.theme.color#rgba") {
    return parseColor(`rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 100})`);
  }
  return parseColor(`rgb(${c.r}, ${c.g}, ${c.b})`);
}

let useColor = (
  theme: PubLeafletPublication.Record["theme"] | null | undefined,
  c: keyof typeof PubThemeDefaults,
) => {
  return useMemo(() => {
    let v = theme?.[c];
    if (isColor(v)) {
      return parseThemeColor(v);
    } else return parseColor(PubThemeDefaults[c]);
  }, [theme?.[c]]);
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
}) {
  let { data } = usePublicationData();
  let { publication: pub } = data || {};
  return (
    <PublicationThemeProvider
      pub_creator={pub?.identity_did || ""}
      theme={(pub?.record as PubLeafletPublication.Record)?.theme}
    >
      <PublicationBackgroundProvider
        theme={(pub?.record as PubLeafletPublication.Record)?.theme}
        pub_creator={pub?.identity_did || ""}
      >
        {props.children}
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
}

export function PublicationBackgroundProvider(props: {
  theme?: PubLeafletPublication.Record["theme"] | null;
  pub_creator: string;
  className?: string;
  children: React.ReactNode;
}) {
  let backgroundImage = props.theme?.backgroundImage?.image?.ref
    ? blobRefToSrc(props.theme?.backgroundImage?.image?.ref, props.pub_creator)
    : null;

  let backgroundImageRepeat = props.theme?.backgroundImage?.repeat;
  let backgroundImageSize = props.theme?.backgroundImage?.width || 500;
  return (
    <div
      className="PubBackgroundWrapper w-full bg-bg-leaflet text-primary h-full flex flex-col bg-cover bg-center bg-no-repeat items-stretch"
      style={{
        backgroundImage: backgroundImage
          ? `url(${backgroundImage})`
          : undefined,
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
  theme?: PubLeafletPublication.Record["theme"] | null;
  pub_creator: string;
  isStandalone?: boolean;
}) {
  let colors = usePubTheme(props.theme, props.isStandalone);
  let cardBorderHidden = !colors.showPageBackground;
  let hasBackgroundImage = !!props.theme?.backgroundImage?.image?.ref;
  return (
    <CardBorderHiddenContext.Provider value={cardBorderHidden}>
      <BaseThemeProvider
        local={props.local}
        {...colors}
        hasBackgroundImage={hasBackgroundImage}
      >
        {props.children}
      </BaseThemeProvider>
    </CardBorderHiddenContext.Provider>
  );
}

export const usePubTheme = (
  theme?: PubLeafletPublication.Record["theme"] | null,
  isStandalone?: boolean,
) => {
  let bgLeaflet = useColor(theme, "backgroundColor");
  let bgPage = useColor(theme, "pageBackground");
  // For standalone documents, use the editor default page background (#FFFFFF)
  // For publications without explicit pageBackground, use bgLeaflet
  if (isStandalone && !theme?.pageBackground) {
    bgPage = parseColor(StandalonePageBackground);
  } else if (theme && !theme.pageBackground) {
    bgPage = bgLeaflet;
  }
  let showPageBackground = theme?.showPageBackground;

  let primary = useColor(theme, "primary");

  let accent1 = useColor(theme, "accentBackground");
  let accent2 = useColor(theme, "accentText");

  let highlight1 = useEntity(null, "theme/highlight-1")?.data.value;
  let highlight2 = useColorAttribute(null, "theme/highlight-2");
  let highlight3 = useColorAttribute(null, "theme/highlight-3");

  return {
    bgLeaflet,
    bgPage,
    primary,
    accent1,
    accent2,
    highlight1,
    highlight2,
    highlight3,
    showPageBackground,
  };
};

export const useLocalPubTheme = (
  theme: PubLeafletPublication.Record["theme"] | undefined,
  showPageBackground?: boolean,
) => {
  const pubTheme = usePubTheme(theme);
  const [localOverrides, setTheme] = useState<Partial<typeof pubTheme>>({});

  const mergedTheme = useMemo(() => {
    let newTheme = {
      ...pubTheme,
      ...localOverrides,
      showPageBackground,
    };
    let newAccentContrast;
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
    if (
      getColorContrast(
        colorToString(sortedAccents[0], "rgb"),
        colorToString(newTheme.primary, "rgb"),
      ) < 30 &&
      getColorContrast(
        colorToString(sortedAccents[1], "rgb"),
        colorToString(
          showPageBackground ? newTheme.bgPage : newTheme.bgLeaflet,
          "rgb",
        ),
      ) > 12
    ) {
      newAccentContrast = sortedAccents[1];
    } else newAccentContrast = sortedAccents[0];
    return {
      ...newTheme,
      accentContrast: newAccentContrast,
    };
  }, [pubTheme, localOverrides, showPageBackground]);
  return {
    theme: mergedTheme,
    setTheme,
    changes: Object.keys(localOverrides).length > 0,
  };
};
