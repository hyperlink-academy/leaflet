import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { scanIndexLocal } from "src/replicache/utils";

// One entry in a publication draft leaflet's nav: a content page has a route,
// an external link tab has an externalUrl instead.
export type PublicationNavEntry = {
  entity: string;
  factID: string;
  position: string;
  title: string;
  route: string | null;
  externalUrl: string | null;
};

export function readNavEntries(
  facts: Fact<Attribute>[],
  rootEntity: string,
): PublicationNavEntry[] {
  const scan = scanIndexLocal(facts);
  return scan
    .eav(rootEntity, "root/page")
    .toSorted((a, b) => (a.data.position > b.data.position ? 1 : -1))
    .map((f) => ({
      entity: f.data.value,
      factID: f.id,
      position: f.data.position,
      title: scan.eav(f.data.value, "page/title")[0]?.data.value ?? "",
      route: scan.eav(f.data.value, "page/route")[0]?.data.value ?? null,
      externalUrl:
        scan.eav(f.data.value, "page/external-url")[0]?.data.value ?? null,
    }));
}
