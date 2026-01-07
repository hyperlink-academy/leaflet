import * as fs from "fs";
import * as path from "path";

/**
 * Recursively processes all files in a directory and removes .js extensions from imports
 */
function fixExtensionsInDirectory(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      fixExtensionsInDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
      fixExtensionsInFile(fullPath);
    }
  }
}

/**
 * Removes .js extensions from import/export statements in a file
 */
function fixExtensionsInFile(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const fixedContent = content.replace(/\.js'/g, "'");

  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent, "utf-8");
    console.log(`Fixed: ${filePath}`);
  }
}

// Get the directory to process from command line arguments
const targetDir = process.argv[2] || "./lexicons/api";

if (!fs.existsSync(targetDir)) {
  console.error(`Directory not found: ${targetDir}`);
  process.exit(1);
}

console.log(`Fixing extensions in: ${targetDir}`);
fixExtensionsInDirectory(targetDir);
console.log("Done!");
