import { useMemo } from "react";
import { Color, parseColor } from "react-aria-components";
import { useEntity, useReplicache } from "src/replicache";
import { ColorOneAttributes } from "src/replicache/attributes";
import { ThemeDefaults } from "./themeUtils";

export function useColorAttribute(
  entity: string | null,
  attribute: keyof ColorOneAttributes,
) {
  // takes a color string and turns it into a react-aria Color type
  // we need it to interact with Color Pickers for themeing
  let { rootEntity } = useReplicache();
  let color = useEntity(entity, attribute);
  let fallbackColor = useEntity(color ? null : rootEntity, attribute);
  return useMemo(() => {
    let c = color || fallbackColor;
    return parseColor(c ? `hsba(${c.data.value})` : ThemeDefaults[attribute]);
  }, [color, fallbackColor, attribute]);
}
export function useColorAttributeNullable(
  entity: string | null,
  attribute: keyof ColorOneAttributes,
) {
  // takes a color string and turns it into a react-aria Color type
  // we need it to interact with Color Pickers for themeing
  let color = useEntity(entity, attribute);
  return useMemo(() => {
    let c = color;
    return c ? parseColor(`hsba(${c.data.value})`) : null;
  }, [color, attribute]);
}

export function colorToString(value: Color, space: "rgb" | "hsba") {
  // takes a react-aria Color type and turns it into an rgb or hsba color string.
  // we need it to set the color in our database when we can the color back from the Color Pickers
  return value.toString(space).slice(space.length + 1, -1);
}
