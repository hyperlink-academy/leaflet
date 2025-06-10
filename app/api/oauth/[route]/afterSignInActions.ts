export type ActionAfterSignIn = {
  action: "subscribe";
  publication: string;
};

export function encodeActionToSearchParam(actions: ActionAfterSignIn): string {
  return encodeURIComponent(JSON.stringify(actions));
}

export function parseActionFromSearchParam(
  param: string | null,
): ActionAfterSignIn | null {
  if (!param) return null;
  try {
    return JSON.parse(decodeURIComponent(param)) as ActionAfterSignIn;
  } catch {
    return null;
  }
}
