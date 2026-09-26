// A canvas block group renders its children with the group entity as their
// `parent` (it is their structural container, like a page), so anything that
// resolves "which page is this block on" from a block's parent must map a
// group back to the canvas it sits on. Mounted groups register here.
let groupPages = new Map<string, string>();

export function registerBlockGroup(group: string, page: string) {
  groupPages.set(group, page);
  return () => {
    if (groupPages.get(group) === page) groupPages.delete(group);
  };
}

export function isBlockGroup(entity: string) {
  return groupPages.has(entity);
}

export function pageOfParent(parent: string): string;
export function pageOfParent(parent: string | undefined): string | undefined;
export function pageOfParent(parent: string | undefined) {
  if (!parent) return parent;
  return groupPages.get(parent) ?? parent;
}
