"use client";
import { createContext, useContext, useMemo } from "react";
import { Color, parseColor } from "react-aria-components";
import { useEntity, useReplicache } from "src/replicache";
import { FilterAttributes } from "src/replicache/attributes";

const ThemeDefaults = {
  "theme/page-background": "#F0F7FA",
  "theme/card-background": "#FFFFFF",
  "theme/primary": "#272727",
  "theme/highlight-1": "#FFFFFF",
  "theme/highlight-2": "#EDD280",
  "theme/highlight-3": "#FFCDC3",

  //everywhere else, accent-background = accent-1 and accent-text = accent-2.
  // we just need to create a migration pipeline before we can change this
  "theme/accent-text": "#FFFFFF",
  "theme/accent-background": "#0000FF",
  "theme/accent-contrast": "#0000FF",
};
const ThemeDefaultsContext = createContext<Partial<typeof ThemeDefaults>>({});

export const ThemeDefaultsProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: Partial<typeof ThemeDefaults>;
}) => {
  return (
    <ThemeDefaultsContext.Provider value={value}>
      {children}
    </ThemeDefaultsContext.Provider>
  );
};

export function useColorAttribute(
  entity: string,
  attribute: keyof FilterAttributes<{ type: "color"; cardinality: "one" }>,
) {
  let { rootEntity } = useReplicache();
  let td = useContext(ThemeDefaultsContext);
  let color = useEntity(entity, attribute);
  let fallbackColor = useEntity(color ? null : rootEntity, attribute);
  return useMemo(() => {
    let c = color || fallbackColor;
    return parseColor(
      c ? `hsba(${c.data.value})` : td[attribute] || ThemeDefaults[attribute],
    );
  }, [color, fallbackColor, attribute]);
}

export function colorToString(value: Color, space: "rgb" | "hsba") {
  return value.toString(space).slice(space.length + 1, -1);
}
