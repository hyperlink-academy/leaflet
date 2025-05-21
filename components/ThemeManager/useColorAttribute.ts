import { useMemo } from "react";
import { Color, parseColor } from "react-aria-components";
import { useEntity, useReplicache } from "src/replicache";
import { FilterAttributes } from "src/replicache/attributes";
import { ThemeDefaults } from "./ThemeProvider";

export function useColorAttribute(
  entity: string | null,
  attribute: keyof FilterAttributes<{ type: "color"; cardinality: "one" }>,
) {
  let { rootEntity } = useReplicache();
  let color = useEntity(entity, attribute);
  let fallbackColor = useEntity(color ? null : rootEntity, attribute);
  return useMemo(() => {
    let c = color || fallbackColor;
    return parseColor(c ? `hsba(${c.data.value})` : ThemeDefaults[attribute]);
  }, [color, fallbackColor, attribute]);
}

export function colorToString(value: Color, space: "rgb" | "hsba") {
  return value.toString(space).slice(space.length + 1, -1);
}
