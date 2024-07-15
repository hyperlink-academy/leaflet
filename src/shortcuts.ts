import { isIOS, isMac } from "@react-aria/utils";

type Shortcut = {
  metaKey?: boolean;
  shift?: boolean;
  key: string;
};
export function addShortcut(shortcut: Shortcut, handler: () => void) {
  let listener = (e: KeyboardEvent) => {
    if (e.shiftKey !== !!shortcut.shift) return;
    if (!!shortcut.metaKey !== (isMac() ? e.metaKey : e.ctrlKey)) return;
    if (e.key !== shortcut.key) return;
    e.preventDefault();
    handler();
  };
  window.addEventListener("keydown", listener);
  return () => window.removeEventListener("keydown", listener);
}
