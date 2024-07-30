import { PermissionToken } from "src/replicache";

export type HomeDoc = { token: PermissionToken; added_at: string };
export function getHomeDocs() {
  let homepageDocs: Array<HomeDoc> = JSON.parse(
    window.localStorage.getItem("homepageDocs") || "[]",
  );
  return homepageDocs;
}

export function addDocToHome(doc: PermissionToken) {
  let homepageDocs = getHomeDocs();
  if (homepageDocs.find((d) => d.token.id === doc.id)) return;
  homepageDocs.push({ token: doc, added_at: new Date().toISOString() });
  window.localStorage.setItem("homepageDocs", JSON.stringify(homepageDocs));
}
