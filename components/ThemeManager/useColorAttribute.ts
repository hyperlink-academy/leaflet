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
  return useMemo(() => {
    return parseColor(
      color ? `rgb(${color.data.value})` : ThemeDefaults[attribute],
    );
  }, [color, attribute]);
}

export function colorToString(value: Color) {
  return value.toString("rgb").slice(4, -1);
}
