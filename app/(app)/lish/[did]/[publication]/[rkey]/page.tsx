import { Metadata } from "next";
import { DocumentPageRenderer } from "./DocumentPageRenderer";
import { fetchPublicationForPage } from "../getPublicationForPage";
import { tryRenderPublicationPage } from "../tryRenderPublicationPage";
import { postPageMetadata } from "./postPageMetadata";

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  if (!decodeURIComponent(params.did)) return { title: "Publication 404" };

  return (
    (await postPageMetadata({
      did: params.did,
      publication: params.publication,
      segment: params.rkey,
    })) ?? { title: "404" }
  );
}
export default async function Post(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication_name = decodeURIComponent(params.publication);
  let rkey = decodeURIComponent(params.rkey);

  if (!did)
    return (
      <div className="p-4 text-lg text-center flex flex-col gap-4">
        <p className="font-bold">Sorry, we can&apos;t find that handle!</p>
        <p>
          This may be a glitch on our end. If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
        </p>
      </div>
    );

  // A /<rkey> URL is either a published publication page or a post; render the
  // matching page, else fall back to the single-post renderer.
  const publication = await fetchPublicationForPage(did, publication_name);
  if (publication) {
    const pageRender = tryRenderPublicationPage({
      did,
      publication,
      path: "/" + rkey,
    });
    if (pageRender) return pageRender;
  }
  return (
    <DocumentPageRenderer did={did} rkey={rkey} publication={publication_name} />
  );
}
