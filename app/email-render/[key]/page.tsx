import { notFound } from "next/navigation";
import { AtpAgent } from "@atproto/api";
import { FontLoader } from "components/FontLoader";
import { loadEmailRenderSpec } from "src/emailRender/render";
import { collectAndFetchBlockResources } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/collectAndFetchBlockResources";
import { EmailRenderView } from "./EmailRenderView";

export const metadata = { robots: { index: false, follow: false } };

// What /api/email-render screenshots, with page JavaScript off: one canvas
// from a post email, drawn by the published renderers and scaled to
// fill a viewport the size of the output image.
export default async function EmailRenderPage(props: {
  params: Promise<{ key: string }>;
}) {
  let { key } = await props.params;
  if (!/^[0-9a-f]{64}$/.test(key)) notFound();
  let spec = await loadEmailRenderSpec(key);
  if (!spec) notFound();

  let resources = await collectAndFetchBlockResources({
    agent: new AtpAgent({ service: "https://public.api.bsky.app" }),
    // First, so its code blocks are the ones prerendered.
    pages: [
      { $type: "pub.leaflet.pages.canvas", blocks: spec.blocks },
      ...spec.pages,
    ],
  });

  return (
    <>
      <FontLoader
        headingFontId={spec.theme.theme?.headingFont}
        bodyFontId={spec.theme.theme?.bodyFont}
      />
      <EmailRenderView
        spec={spec}
        resources={{
          bskyPostData: JSON.parse(JSON.stringify(resources.bskyPostData)),
          standardSitePostData: JSON.parse(
            JSON.stringify(resources.standardSitePostData),
          ),
          pollData: resources.pollData,
          prerenderedCodeBlocks: resources.prerenderedCodeBlocks,
        }}
      />
    </>
  );
}
