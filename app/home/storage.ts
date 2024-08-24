import { PermissionToken } from "src/replicache";

export type HomeDoc = {
  token: PermissionToken;
  added_at: string;
  hidden?: boolean;
};
type HomeDocsStorage = {
  version: number;
  docs: Array<HomeDoc>;
};
let defaultValue: HomeDocsStorage = {
  version: 1,
  docs: [],
};
const key = "homepageDocs-v1";
export function getHomeDocs() {
  let homepageDocs: HomeDocsStorage = JSON.parse(
    window.localStorage.getItem(key) || JSON.stringify(defaultValue),
  );
  return homepageDocs.docs;
}

export function addDocToHome(doc: PermissionToken) {
  let homepageDocs = getHomeDocs();
  if (homepageDocs.find((d) => d.token.id === doc.id)) return;
  homepageDocs.push({ token: doc, added_at: new Date().toISOString() });
  let newValue: HomeDocsStorage = {
    version: 1,
    docs: homepageDocs,
  };
  window.localStorage.setItem(key, JSON.stringify(newValue));
}

export function removeDocFromHome(doc: PermissionToken) {
  let homepageDocs = getHomeDocs();
  let newDocs = homepageDocs.filter((d) => d.token.id !== doc.id);
  let newValue: HomeDocsStorage = {
    version: 1,
    docs: newDocs,
  };
  window.localStorage.setItem(key, JSON.stringify(newValue));
}

export function hideDoc(doc: PermissionToken) {
  let homepageDocs = getHomeDocs();
  let newDocs = homepageDocs.filter((d) => d.token.id !== doc.id);
  newDocs.push({
    token: doc,
    added_at: new Date().toISOString(),
    hidden: true,
  });
  let newValue: HomeDocsStorage = {
    version: 1,
    docs: newDocs,
  };
  window.localStorage.setItem(key, JSON.stringify(newValue));
}
