export function sortPublicationPages<T extends { path: string | null }>(
  pages: T[],
): T[] {
  return [...pages].sort((a, b) => {
    let aHome = a.path === "/" ? 0 : 1;
    let bHome = b.path === "/" ? 0 : 1;
    if (aHome !== bHome) return aHome - bHome;
    return (a.path ?? "").localeCompare(b.path ?? "");
  });
}
