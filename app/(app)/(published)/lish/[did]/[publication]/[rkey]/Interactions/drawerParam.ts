import type { DrawerThread } from "./drawerThreadContext";

const threadPrefixes: { [K in DrawerThread["type"]]: string } = {
  thread: "thread",
  quotes: "quotes",
  standardSitePost: "post",
  recommends: "recommends",
  tag: "tag",
};

const threadTypes = new Map(
  Object.entries(threadPrefixes).map(([type, prefix]) => [
    prefix,
    type as DrawerThread["type"],
  ]),
);

export function serializeDrawerParam(
  state: { drawer: "comments" | "quotes"; threadStack: DrawerThread[] },
  document_uri: string,
) {
  let top = state.threadStack[state.threadStack.length - 1];
  if (!top) return state.drawer;
  if (top.type === "recommends" && top.uri === document_uri)
    return "recommends";
  return `${threadPrefixes[top.type]}:${top.type === "tag" ? top.tag : top.uri}`;
}

export function parseDrawerParam(
  value: string | null,
  document_uri: string,
): { tab: "comments" | "quotes"; thread?: DrawerThread } {
  let separator = value?.indexOf(":") ?? -1;
  if (!value || separator === -1) {
    if (value === "recommends")
      return {
        tab: "comments",
        thread: { type: "recommends", uri: document_uri },
      };
    return { tab: value === "quotes" ? "quotes" : "comments" };
  }

  let type = threadTypes.get(value.slice(0, separator));
  let key = value.slice(separator + 1);
  if (!type || !key) return { tab: "comments" };
  return {
    tab: "comments",
    thread: type === "tag" ? { type, tag: key } : { type, uri: key },
  };
}

export function drawerThreadFromLocation(document_uri: string) {
  if (typeof window === "undefined") return undefined;
  let value = new URL(window.location.href).searchParams.get(
    "interactionDrawer",
  );
  return parseDrawerParam(value, document_uri).thread;
}
