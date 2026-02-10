import { inngest } from "app/api/inngest/client";

/**
 * This script triggers the fix_incorrect_site_values Inngest function
 * to find and fix documents with incorrect site values for a given DID.
 *
 * Usage: npx ts-node scripts/trigger-fix-incorrect-site-values.ts <did>
 * Example: npx ts-node scripts/trigger-fix-incorrect-site-values.ts did:plc:ofrbh253gwicbkc5nktqepol
 */
async function triggerFixIncorrectSiteValues() {
  const did = process.argv[2];

  if (!did) {
    console.error(
      "Usage: npx ts-node scripts/trigger-fix-incorrect-site-values.ts <did>",
    );
    console.error(
      "Example: npx ts-node scripts/trigger-fix-incorrect-site-values.ts did:plc:ofrbh253gwicbkc5nktqepol",
    );
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("Trigger Fix Incorrect Site Values");
  console.log("=".repeat(60));
  console.log(`\nDID: ${did}\n`);

  try {
    const result = await inngest.send({
      name: "documents/fix-incorrect-site-values",
      data: { did },
    });

    console.log("Successfully triggered Inngest function!");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Failed to trigger Inngest function:", error);
    process.exit(1);
  }
}

triggerFixIncorrectSiteValues();
