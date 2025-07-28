import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
  PublicationThemeProviderDashboard,
} from "components/ThemeManager/PublicationThemeProvider";
import { PubLeafletPublication } from "lexicons/api";
import { supabaseServerClient } from "supabase/serverClient";
import { BskyAgent } from "@atproto/api";

import { SubscribeForm } from "app/lish/Subscribe";
import Link from "next/link";

export default async function SubscribePage(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let agent = new BskyAgent({ service: "https://public.api.bsky.app" });
  let uri;
  let publication_name = decodeURIComponent(params.publication);

  let [{ data: publication }, { data: profile }] = await Promise.all([
    supabaseServerClient
      .from("publications")
      .select(
        `*,
        publication_subscriptions(*),
      documents_in_publications(documents(*))
      `,
      )
      .eq("identity_did", did)
      .or(`name.eq."${publication_name}", uri.eq."${uri}"`)
      .single(),
    agent.getProfile({ actor: did }),
  ]);

  let record = publication?.record as PubLeafletPublication.Record | null;
  let hasPageBackground = !!record?.theme?.showPageBackground;

  let isLoggedIn = true;
  let isSubscribed = false;

  if (!publication) {
    return <div>hmm nothing here</div>;
  }
  return (
    <PublicationThemeProvider
      record={record}
      pub_creator={publication.identity_did}
    >
      <PublicationBackgroundProvider
        record={record}
        pub_creator={publication.identity_did}
      >
        <div className="p-2 w-fit mx-auto my-auto ">
          <div
            className={`max-w-sm w-full px-3 sm:px-4 py-4 h-fit flex flex-col justify-center text-center ${hasPageBackground ? " bg-[rgba(var(--bg-page),var(--bg-page-alpha))] rounded-lg border border-border" : ""}`}
          >
            {record?.icon && (
              <div
                className="shrink-0 w-12 h-12 pt-1 rounded-full mx-auto"
                style={{
                  backgroundImage: `url(/api/atproto_images?did=${did}&cid=${(record.icon.ref as unknown as { $link: string })["$link"]})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              />
            )}{" "}
            <h2 className="pt-1">{record?.name}</h2>
            {record?.description && <div>{record?.description}</div>}
            <div className="text-sm text-tertiary pt-1">
              {profile.displayName} |{" "}
              <a
                className="text-tertiary"
                href={`https://bsky.app/profile/${profile.handle}`}
              >
                @{profile.handle}
              </a>
            </div>
            <div className="mt-6">
              <SubscribeForm pub_uri="" base_url="" subscribed={isSubscribed} />
            </div>
          </div>
        </div>
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
}
