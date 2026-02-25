import { useHasBackgroundImageContext } from "components/ThemeManager/ThemeProvider";

export function useHasBackgroundImage(entityID?: string | null) {
  return useHasBackgroundImageContext();
}
