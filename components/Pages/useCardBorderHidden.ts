import { useCardBorderHiddenContext } from "components/ThemeManager/ThemeProvider";

export function useCardBorderHidden(entityID?: string | null) {
  return useCardBorderHiddenContext();
}
