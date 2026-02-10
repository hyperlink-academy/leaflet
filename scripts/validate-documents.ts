import { createClient } from "@supabase/supabase-js";
import { Database, Json } from "supabase/database.types";
import { jsonToLex } from "@atproto/lexicon";
import {
  PubLeafletDocument,
  SiteStandardDocument,
} from "lexicons/api";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes("--dry-run");

interface ValidationIssue {
  uri: string;
  error: string;
  fixed?: boolean;
}

// Fields that should be integers based on lexicon schemas
const INTEGER_FIELDS = new Set([
  "x", "y", "width", "height", "rotation", "offset", "level",
  "r", "g", "b", "a",
]);

/**
 * Recursively fix float values that should be integers
 */
function fixFloatsToIntegers(obj: unknown): { value: unknown; modified: boolean } {
  if (obj === null || obj === undefined) {
    return { value: obj, modified: false };
  }

  if (Array.isArray(obj)) {
    let modified = false;
    const newArr = obj.map((item) => {
      const result = fixFloatsToIntegers(item);
      if (result.modified) modified = true;
      return result.value;
    });
    return { value: newArr, modified };
  }

  if (typeof obj === "object") {
    let modified = false;
    const newObj: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (INTEGER_FIELDS.has(key) && typeof value === "number" && !Number.isInteger(value)) {
        newObj[key] = Math.round(value);
        modified = true;
      } else {
        const result = fixFloatsToIntegers(value);
        newObj[key] = result.value;
        if (result.modified) modified = true;
      }
    }

    return { value: newObj, modified };
  }

  return { value: obj, modified: false };
}

async function validateDocuments(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Document Validation Script");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "FIX MODE"}`);
  console.log("=".repeat(60));

  const issues: ValidationIssue[] = [];
  let offset = 0;
  let totalProcessed = 0;
  let totalWithIssues = 0;
  let totalFixed = 0;

  console.log("\nFetching documents in batches...\n");

  while (true) {
    const { data: documents, error } = await supabase
      .from("documents")
      .select("uri, data")
      .range(offset, offset + BATCH_SIZE - 1)
      .order("uri");

    if (error) {
      console.error("Error fetching documents:", error);
      break;
    }

    if (!documents || documents.length === 0) {
      break;
    }

    for (const doc of documents) {
      totalProcessed++;

      const rawData = doc.data;
      if (!rawData || typeof rawData !== "object") {
        issues.push({ uri: doc.uri, error: "Document data is null or not an object" });
        totalWithIssues++;
        continue;
      }

      // Convert JSON to lexicon types (handles BlobRef conversion)
      const data = jsonToLex(rawData);

      // Determine document type and validate
      const $type = (data as Record<string, unknown>).$type;

      let result: { success: boolean; error?: unknown };
      let validateFn: (v: unknown) => { success: boolean; error?: unknown };

      if ($type === "site.standard.document") {
        validateFn = SiteStandardDocument.validateRecord;
        result = validateFn(data);
      } else if (
        $type === "pub.leaflet.document" ||
        // Legacy records without $type but with pages array
        (Array.isArray((data as Record<string, unknown>).pages) &&
          typeof (data as Record<string, unknown>).author === "string")
      ) {
        validateFn = PubLeafletDocument.validateRecord;
        result = validateFn(data);
      } else {
        issues.push({ uri: doc.uri, error: `Unknown document type: ${$type || "undefined"}` });
        totalWithIssues++;
        continue;
      }

      if (!result.success) {
        const errorStr = String(result.error);

        // Check if it's an integer validation error we can fix
        if (errorStr.includes("must be an integer")) {
          const { value: fixedData, modified } = fixFloatsToIntegers(rawData);

          if (modified) {
            // Validate the fixed data
            const fixedResult = validateFn(jsonToLex(fixedData));

            if (fixedResult.success) {
              if (!DRY_RUN) {
                const { error: updateError } = await supabase
                  .from("documents")
                  .update({ data: fixedData as Json })
                  .eq("uri", doc.uri);

                if (updateError) {
                  issues.push({ uri: doc.uri, error: `Fix failed: ${updateError.message}` });
                  totalWithIssues++;
                } else {
                  issues.push({ uri: doc.uri, error: errorStr, fixed: true });
                  totalFixed++;
                }
              } else {
                issues.push({ uri: doc.uri, error: errorStr, fixed: true });
                totalFixed++;
              }
            } else {
              // Still has issues after fix
              issues.push({ uri: doc.uri, error: String(fixedResult.error) });
              totalWithIssues++;
            }
          } else {
            issues.push({ uri: doc.uri, error: errorStr });
            totalWithIssues++;
          }
        } else {
          issues.push({ uri: doc.uri, error: errorStr });
          totalWithIssues++;
        }
      }
    }

    process.stdout.write(
      `\rProcessed ${totalProcessed} documents, ${totalFixed} fixed, ${totalWithIssues} with issues...`,
    );
    offset += BATCH_SIZE;
  }

  console.log("\n");

  // Print summary
  console.log("=".repeat(60));
  console.log("VALIDATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total documents processed: ${totalProcessed}`);
  console.log(`Documents fixed: ${totalFixed}${DRY_RUN ? " (dry run)" : ""}`);
  console.log(`Documents with unfixable issues: ${totalWithIssues}`);
  console.log("");

  if (issues.length > 0) {
    console.log("DETAILS:");
    console.log("-".repeat(60));

    for (const issue of issues) {
      const status = issue.fixed ? "[FIXED]" : "[ERROR]";
      console.log(`\n${status} ${issue.uri}`);
      console.log(`  ${issue.error}`);
    }
  } else {
    console.log("No issues found!");
  }

  console.log("\n" + "=".repeat(60));
}

validateDocuments().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
