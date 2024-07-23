import { isIOS, isMac } from "@react-aria/utils";
import { useUIState } from "./useUIState";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "./replicache";

type Shortcut = {
  metaKey?: boolean;
  shift?: boolean;
  key: string | string[];
  handler: () => void;
};
export function addShortcut(shortcuts: Shortcut | Shortcut[]) {
  let listener = (e: KeyboardEvent) => {
    for (let shortcut of [shortcuts].flat()) {
      if (e.shiftKey !== !!shortcut.shift) continue;
      if (!!shortcut.metaKey !== (isMac() ? e.metaKey : e.ctrlKey)) continue;
      if (![shortcut.key].flat().includes(e.key)) continue;
      e.preventDefault();
      return shortcut.handler();
    }
  };
  window.addEventListener("keydown", listener);
  return () => window.removeEventListener("keydown", listener);
}
