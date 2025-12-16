import { NextRequest, NextResponse } from "next/server";
import { AtpAgent, AtUri } from "@atproto/api";
import { DidResolver } from "@atproto/identity";
import {
  PubLeafletDocument,
  PubLeafletPublication,
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
} from "lexicons/api";

const didResolver = new DidResolver({});

export async function GET(request: NextRequest) {
  try {
    const atUriString = request.nextUrl.searchParams.get("uri");

    if (!atUriString) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing uri parameter",
        },
        { status: 400 },
      );
    }

    const uri = new AtUri(atUriString);

    // Only allow document and publication collections
    if (
      uri.collection !== "pub.leaflet.document" &&
      uri.collection !== "pub.leaflet.publication"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported collection type. Must be pub.leaflet.document or pub.leaflet.publication",
        },
        { status: 400 },
      );
    }

    // Resolve DID to get service endpoint
    const did = await didResolver.resolve(uri.host);
    const service = did?.service?.[0];

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not resolve DID service endpoint",
        },
        { status: 404 },
      );
    }

    // Fetch the record from AT Protocol
    const agent = new AtpAgent({ service: service.serviceEndpoint as string });

    let recordResponse;
    try {
      recordResponse = await agent.com.atproto.repo.getRecord({
        repo: uri.host,
        collection: uri.collection,
        rkey: uri.rkey,
      });
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: "Record not found",
        },
        { status: 404 },
      );
    }

    // Validate based on collection type
    if (uri.collection === "pub.leaflet.document") {
      const result = PubLeafletDocument.validateRecord(
        recordResponse.data.value,
      );
      if (result.success) {
        return NextResponse.json({
          success: true,
          collection: uri.collection,
          record: result.value,
        });
      } else {
        // Detailed validation: validate pages and blocks individually
        const record = recordResponse.data.value as {
          pages?: Array<{ $type?: string; blocks?: Array<{ block?: unknown }> }>;
        };
        const pageErrors: Array<{
          pageIndex: number;
          pageType: string;
          error?: unknown;
          blockErrors?: Array<{
            blockIndex: number;
            blockType: string;
            error: unknown;
            block: unknown;
          }>;
        }> = [];

        if (record.pages && Array.isArray(record.pages)) {
          for (let pageIndex = 0; pageIndex < record.pages.length; pageIndex++) {
            const page = record.pages[pageIndex];
            const pageType = page?.$type || "unknown";

            // Validate page based on type
            let pageResult;
            if (pageType === "pub.leaflet.pages.linearDocument") {
              pageResult = PubLeafletPagesLinearDocument.validateMain(page);
            } else if (pageType === "pub.leaflet.pages.canvas") {
              pageResult = PubLeafletPagesCanvas.validateMain(page);
            } else {
              pageErrors.push({
                pageIndex,
                pageType,
                error: `Unknown page type: ${pageType}`,
              });
              continue;
            }

            if (!pageResult.success) {
              // Page has errors, validate individual blocks
              const blockErrors: Array<{
                blockIndex: number;
                blockType: string;
                error: unknown;
                block: unknown;
              }> = [];

              if (page.blocks && Array.isArray(page.blocks)) {
                for (
                  let blockIndex = 0;
                  blockIndex < page.blocks.length;
                  blockIndex++
                ) {
                  const blockWrapper = page.blocks[blockIndex];
                  const blockType =
                    (blockWrapper?.block as { $type?: string })?.$type ||
                    "unknown";

                  // Validate block wrapper based on page type
                  let blockResult;
                  if (pageType === "pub.leaflet.pages.linearDocument") {
                    blockResult =
                      PubLeafletPagesLinearDocument.validateBlock(blockWrapper);
                  } else {
                    blockResult =
                      PubLeafletPagesCanvas.validateBlock(blockWrapper);
                  }

                  if (!blockResult.success) {
                    blockErrors.push({
                      blockIndex,
                      blockType,
                      error: blockResult.error,
                      block: blockWrapper,
                    });
                  }
                }
              }

              pageErrors.push({
                pageIndex,
                pageType,
                error: pageResult.error,
                blockErrors: blockErrors.length > 0 ? blockErrors : undefined,
              });
            }
          }
        }

        return NextResponse.json({
          success: false,
          collection: uri.collection,
          error: result.error,
          pageErrors: pageErrors.length > 0 ? pageErrors : undefined,
          record: recordResponse.data.value,
        });
      }
    }

    if (uri.collection === "pub.leaflet.publication") {
      const result = PubLeafletPublication.validateRecord(
        recordResponse.data.value,
      );
      if (result.success) {
        return NextResponse.json({
          success: true,
          collection: uri.collection,
          record: result.value,
        });
      } else {
        return NextResponse.json({
          success: false,
          collection: uri.collection,
          error: result.error,
        });
      }
    }
  } catch (error) {
    console.error("Error validating AT URI:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Invalid URI or internal error",
      },
      { status: 400 },
    );
  }
}
