import type { ReadonlyURLSearchParams } from "next/navigation";

export function replaceWithoutParams(
  router: { replace: (href: string, options?: { scroll?: boolean }) => void },
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  keys: string[],
  options?: { scroll?: boolean },
) {
  let next = new URLSearchParams(searchParams.toString());
  for (let key of keys) next.delete(key);
  let qs = next.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname, options);
}
