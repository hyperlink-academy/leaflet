import { idResolver } from "app/(home-pages)/reader/idResolver";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { ProfilePageLayout } from "./ProfilePageLayout";
import { supabaseServerClient } from "supabase/serverClient";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import type { Post } from "app/(home-pages)/reader/getReaderFeed";

export default async function ProfilePage(props: {
  params: Promise<{ didOrHandle: string }>;
}) {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);

  // Resolve handle to DID if necessary
  let did = didOrHandle;

  if (!didOrHandle.startsWith("did:")) {
    let resolved = await idResolver.handle.resolve(didOrHandle);
    if (!resolved) {
      return (
        <NotFoundLayout>
          <p className="font-bold">Sorry, can&apos;t resolve handle!</p>
          <p>
            This may be a glitch on our end. If the issue persists please{" "}
            <a href="mailto:contact@leaflet.pub">send us a note</a>.
          </p>
        </NotFoundLayout>
      );
    }
    did = resolved;
  }

  // Fetch profile, publications, and documents in parallel
  let [{ data: profile }, { data: pubs }, { data: docs }] = await Promise.all([
    supabaseServerClient
      .from("bsky_profiles")
      .select(`*`)
      .eq("did", did)
      .single(),
    supabaseServerClient
      .from("publications")
      .select("*")
      .eq("identity_did", did),
    supabaseServerClient
      .from("documents")
      .select(
        `*,
        comments_on_documents(count),
        document_mentions_in_bsky(count),
        documents_in_publications(publications(*))`,
      )
      .like("uri", `at://${did}/%`)
      .order("indexed_at", { ascending: false }),
  ]);

  // Build a map of publications for quick lookup
  let pubMap = new Map<string, NonNullable<typeof pubs>[number]>();
  for (let pub of pubs || []) {
    pubMap.set(pub.uri, pub);
  }

  // Transform data to Post[] format
  let handle = profile?.handle ? `@${profile.handle}` : null;
  let posts: Post[] = [];

  for (let doc of docs || []) {
    // Find the publication for this document (if any)
    let pubFromDoc = doc.documents_in_publications?.[0]?.publications;
    let pub = pubFromDoc ? pubMap.get(pubFromDoc.uri) || pubFromDoc : null;

    let post: Post = {
      author: handle,
      documents: {
        data: doc.data,
        uri: doc.uri,
        indexed_at: doc.indexed_at,
        comments_on_documents: doc.comments_on_documents,
        document_mentions_in_bsky: doc.document_mentions_in_bsky,
      },
    };

    if (pub) {
      post.publication = {
        href: getPublicationURL(pub),
        pubRecord: pub.record,
        uri: pub.uri,
      };
    }

    posts.push(post);
  }

  return (
    <ProfilePageLayout
      profile={profile}
      publications={pubs || []}
      posts={posts}
    />
  );
}
