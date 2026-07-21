const fs = require("fs");
const lock = JSON.parse(fs.readFileSync("./package-lock.json", "utf8"));
const pkgs = lock.packages || {};
const issues = [];
for (const [name, info] of Object.entries(pkgs)) {
  if (name === "") continue;
  if (!info.resolved && !info.link) {
    issues.push(name);
  }
}
console.log("Packages missing resolved field:", issues.length);
issues.forEach(i => console.log(" ", i));

// Also check for undefined or empty string values in resolved
const badResolved = [];
for (const [name, info] of Object.entries(pkgs)) {
  if (name === "") continue;
  if (info.hasOwnProperty("resolved") && (info.resolved === undefined || info.resolved === null || info.resolved === "")) {
    badResolved.push(name);
  }
}
console.log("\nPackages with empty/null/undefined resolved:", badResolved.length);
badResolved.forEach(i => console.log(" ", i));

// Check for any dependencies that reference packages not in the packages list
const missing = [];
for (const [name, info] of Object.entries(pkgs)) {
  const deps = { ...info.dependencies, ...info.devDependencies, ...info.optionalDependencies };
  for (const [dep, ver] of Object.entries(deps || {})) {
    // Check if the dependency can be found
    const depPath = name ? name + "/node_modules/" + dep : "node_modules/" + dep;
    const rootPath = "node_modules/" + dep;
    if (!pkgs[depPath] && !pkgs[rootPath]) {
      // Could be resolved via parent node_modules, skip for now
    }
  }
}

// Check lockfileVersion
console.log("\nlockfileVersion:", lock.lockfileVersion);
console.log("Total packages:", Object.keys(pkgs).length);
