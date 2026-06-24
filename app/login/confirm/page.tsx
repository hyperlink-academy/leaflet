import { AtUri } from "@atproto/api";
import { PubIcon } from "components/ActionBar/Publications";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { supabaseServerClient } from "supabase/serverClient";
import { LoginConfirmForm } from "./LoginConfirmForm";

// Where custom-domain email login lands when the user has no existing main-site
// session (see /api/auth/email-login). Collecting the code here mints the
// canonical auth_token first-party on the main site; on success confirmEmailLogin
// hands the session to the originating domain's receive_auth_callback. When the
// login started on a publication's custom domain, the route forwards that
// publication's uri so the page renders in the publication's theme.
export default async function LoginConfirmPage(props: {
  searchParams: Promise<{ publication?: string }>;
}) {
  let { publication: publicationUri } = await props.searchParams;

  if (publicationUri) {
    let { data: publication } = await supabaseServerClient
      .from("publications")
      .select("*")
      .eq("uri", publicationUri)
      .maybeSingle();
    let record = normalizePublicationRecord(publication?.record);
    if (publication && record) {
      let iconUrl = record.icon
        ? blobRefToSrc(record.icon.ref, new AtUri(publication.uri).host)
        : undefined;
      return (
        <PublicationThemeProvider
          record={record}
          pub_creator={publication.identity_did}
        >
          <PublicationBackgroundProvider
            record={record}
            pub_creator={publication.identity_did}
            className="min-h-screen"
          >
            <div className="w-full min-h-screen flex items-center justify-center p-4">
              <div
                className="flex flex-col items-center w-full max-w-sm text-primary
                  bg-[rgba(var(--bg-page),var(--bg-page-alpha))]
                  border border-border-light rounded-lg shadow-md
                  p-6"
              >
                <div className="flex flex-row gap-2 items-center pb-4">
                  <PubIcon icon={iconUrl} pubName={record.name} small />
                  <h4 className="grow min-w-0 text-primary">{record.name}</h4>
                </div>
                <LoginConfirmForm />
              </div>
            </div>
          </PublicationBackgroundProvider>
        </PublicationThemeProvider>
      );
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-4">
      <div className="accent-container p-4 py-5">
        <LoginConfirmForm />
      </div>
    </div>
  );
}
