import { isMac } from "@react-aria/utils";

export const metaKey = () => (isMac() ? "⌘" : "Ctrl");
