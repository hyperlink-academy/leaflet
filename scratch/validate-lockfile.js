const lock = require('../package-lock.json');
const pkg = require('../package.json');

// Check lockfileVersion
console.log('lockfileVersion:', lock.lockfileVersion);

// Check that every dependency in package.json appears in the lockfile
const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
for (const [name, version] of Object.entries(deps)) {
  const path = 'node_modules/' + name;
  if (!lock.packages[path]) {
    console.log('MISSING from lockfile packages:', name, '(path:', path, ')');
  }
}

// Check for entries in lockfile packages that reference missing dependencies
let issues = 0;
for (const [pkgPath, entry] of Object.entries(lock.packages)) {
  if (pkgPath === '') continue; // root
  if (!entry.resolved && !entry.link && !entry.dev) {
    if (!entry.version) {
      console.log('Entry without version or resolved:', pkgPath);
      issues++;
    }
  }
  // Check for entries whose dependencies reference non-existent packages
  const allDeps = Object.assign({}, entry.dependencies || {}, entry.optionalDependencies || {});
  for (const [depName, depRange] of Object.entries(allDeps)) {
    let found = false;
    // Check nested first
    const nestedPath = pkgPath + '/node_modules/' + depName;
    if (lock.packages[nestedPath]) { found = true; continue; }
    // Check parent paths
    let current = pkgPath;
    while (current.includes('/')) {
      const idx = current.lastIndexOf('/node_modules/');
      if (idx === -1) break;
      current = current.substring(0, idx);
      const parentPath = current + '/node_modules/' + depName;
      if (lock.packages[parentPath]) { found = true; break; }
    }
    // Check top level
    const topPath = 'node_modules/' + depName;
    if (lock.packages[topPath]) found = true;

    if (!found) {
      console.log('UNRESOLVABLE dependency:', depName, 'required by', pkgPath);
      issues++;
    }
  }
}
console.log('Total issues found:', issues);
