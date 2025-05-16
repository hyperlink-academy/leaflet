import { IdResolver } from "@atproto/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";

import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import React from "react";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument } from "lexicons/api";
import Link from "next/link";

const idResolver = new IdResolver();

export async function generateMetadata(props: {
  params: Promise<{ publication: string; handle: string }>;
}): Promise<Metadata> {
  let did = await idResolver.handle.resolve((await props.params).handle);
  if (!did) return { title: "Publication 404" };

  let { result: publication } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent((await props.params).publication),
    },
    { supabase: supabaseServerClient },
  );
  if (!publication) return { title: "404 Publication" };
  return { title: decodeURIComponent((await props.params).publication) };
}

//This is the admin dashboard of the publication
export default async function Publication(props: {
  params: Promise<{ publication: string; handle: string }>;
}) {
  let params = await props.params;
  let did = await idResolver.handle.resolve((await props.params).handle);
  if (!did) return <PubNotFound />;
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select(
      `*,
      documents_in_publications(documents(*))
      `,
    )
    .eq("identity_did", did)
    .eq("name", decodeURIComponent((await props.params).publication))
    .single();
  if (!publication) return <PubNotFound />;

  try {
    return (
      <ThemeProvider entityID={null}>
        <div>publication index page </div>
        {publication.documents_in_publications.map((doc) => {
          if (!doc.documents) return null;
          let uri = new AtUri(doc.documents.uri);
          let record = doc.documents.data as PubLeafletDocument.Record;
          return (
            <React.Fragment key={doc.documents?.uri}>
              <div className="flex  w-full ">
                <Link
                  href={`/lish/${params.handle}/${params.publication}/${uri.rkey}`}
                  className="publishedPost grow flex flex-col gap-2 hover:!no-underline"
                >
                  <h3 className="text-primary">{record.title}</h3>
                </Link>
              </div>
              <hr className="last:hidden border-border-light" />
            </React.Fragment>
          );
        })}
      </ThemeProvider>
    );
  } catch (e) {
    console.log(e);
    return <pre>{JSON.stringify(e, undefined, 2)}</pre>;
  }
}

const PubNotFound = () => {
  return <div>ain't no pub here</div>;
};
