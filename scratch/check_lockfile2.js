const fs = require("fs");
const lock = JSON.parse(fs.readFileSync("./package-lock.json", "utf8"));
const pkgs = lock.packages || {};

// Check for packages that depend on something that isn't in the lockfile
const allPkgNames = new Set(Object.keys(pkgs));

function findPkgPath(fromPkg, depName) {
  // Walk up the directory tree to find the dependency
  let current = fromPkg;
  while (current) {
    const candidate = current ? current + "/node_modules/" + depName : "node_modules/" + depName;
    if (allPkgNames.has(candidate)) return candidate;
    const lastNM = current.lastIndexOf("/node_modules/");
    if (lastNM === -1) break;
    current = current.substring(0, lastNM);
  }
  // Check root
  const rootCandidate = "node_modules/" + depName;
  if (allPkgNames.has(rootCandidate)) return rootCandidate;
  return null;
}

const missingDeps = [];
for (const [name, info] of Object.entries(pkgs)) {
  if (name === "") continue;
  const allDeps = { ...(info.dependencies || {}), ...(info.peerDependencies || {}) };
  for (const [dep, ver] of Object.entries(allDeps)) {
    if (info.peerDependenciesMeta && info.peerDependenciesMeta[dep] && info.peerDependenciesMeta[dep].optional) continue;
    const found = findPkgPath(name, dep);
    if (!found) {
      missingDeps.push({ from: name, dep, ver });
    }
  }
}

console.log("Missing dependencies:", missingDeps.length);
missingDeps.forEach(m => console.log(`  ${m.from} -> ${m.dep}@${m.ver}`));

// Check for entries that might be orphaned (not required by any other package and not in root deps)
const rootPkg = pkgs[""];
const rootDeps = new Set([
  ...Object.keys(rootPkg.dependencies || {}),
  ...Object.keys(rootPkg.devDependencies || {}),
  ...Object.keys(rootPkg.optionalDependencies || {})
]);

// Find all reachable packages from root
const reachable = new Set();
function markReachable(pkgPath) {
  if (reachable.has(pkgPath)) return;
  reachable.add(pkgPath);
  const info = pkgs[pkgPath];
  if (!info) return;
  const allDeps = { ...(info.dependencies || {}), ...(info.optionalDependencies || {}) };
  for (const dep of Object.keys(allDeps)) {
    const found = findPkgPath(pkgPath, dep);
    if (found) markReachable(found);
  }
}

for (const dep of rootDeps) {
  const path = findPkgPath("", dep);
  if (path) markReachable(path);
}

const orphaned = [];
for (const name of allPkgNames) {
  if (name === "") continue;
  if (!reachable.has(name)) {
    orphaned.push(name);
  }
}

console.log("\nOrphaned packages (not reachable from root):", orphaned.length);
orphaned.slice(0, 50).forEach(o => console.log(" ", o));
if (orphaned.length > 50) console.log("  ... and", orphaned.length - 50, "more");
