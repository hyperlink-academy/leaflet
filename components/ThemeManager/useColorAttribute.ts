import { useMemo } from "react";
import { Color, parseColor } from "react-aria-components";
import { useEntity } from "src/replicache";
import { FilterAttributes } from "src/replicache/attributes";
import { ThemeDefaults } from "./ThemeProvider";

export function useColorAttribute(
  entity: string,
  attribute: keyof FilterAttributes<{ type: "color"; cardinality: "one" }>,
) {
  let color = useEntity(entity, attribute);
  console.log(attribute, color?.attribute);
  return useMemo(() => {
    return parseColor(
      color ? `hsba(${color.data.value})` : ThemeDefaults[attribute],
    );
  }, [color, attribute]);
}

export function colorToString(value: Color, space: "rgb" | "hsba") {
  return value.toString(space).slice(space.length + 1, -1);
}
