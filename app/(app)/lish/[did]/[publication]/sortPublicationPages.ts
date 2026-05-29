export function sortPublicationPages<
  T extends { id: number; sort_order: string },
>(pages: T[]): T[] {
  return [...pages].sort((a, b) => {
    if (a.sort_order === b.sort_order) return a.id - b.id;
    return a.sort_order > b.sort_order ? 1 : -1;
  });
}
