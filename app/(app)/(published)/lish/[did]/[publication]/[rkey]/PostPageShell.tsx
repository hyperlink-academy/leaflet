import { Fragment } from "react";
import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { LeafletLayout } from "components/LeafletLayout";
import { mergePreferences } from "src/utils/mergePreferences";
import { PostDataProvider } from "./PostDataProvider";
import { PostPages } from "./PostPages";
import { QuoteHandler } from "./QuoteHandler";
import { PublishedPostFrame } from "./postFrame";
import type { LoadedPostPage } from "./loadPostPage";

// No "use client": rendered by the published route as a server component and
// by the reader from inside a client tree, so it can't use hooks itself.
export function PostPageShell(props: {
  post: LoadedPostPage;
  commentsSlot: React.ReactNode;
  // The post is one surface inside a larger app rather than the whole
  // document: its theme stays off :root, and the host supplies the PostFrame.
  embedded?: boolean;
  children?: React.ReactNode;
}) {
  let { document, did, profile, contributorProfiles } = props.post;
  const record = document.normalizedDocument;
  const pubRecord = document.normalizedPublication;
  let pub_creator = document.publication?.identity_did || did;
  let Frame = props.embedded ? Fragment : PublishedPostFrame;

  return (
    <PostDataProvider document={document} initial={props.post.resources}>
      {props.children}
      <Frame>
        <PublicationThemeProvider
          local={props.embedded}
          record={{ theme: document.theme }}
          pub_creator={pub_creator}
          isStandalone={!pubRecord}
        >
          <PublicationBackgroundProvider
            record={{ theme: document.theme }}
            pub_creator={pub_creator}
          >
            <LeafletLayout>
              <PostPages
                document_uri={document.uri}
                preferences={mergePreferences(
                  record?.preferences,
                  pubRecord?.preferences,
                )}
                pubRecord={pubRecord}
                profile={profile}
                contributors={contributorProfiles}
                document={document}
                did={did}
                prerenderedCodeBlocks={props.post.prerenderedCodeBlocks}
                commentsSlot={props.commentsSlot}
              />
            </LeafletLayout>

            <QuoteHandler />
          </PublicationBackgroundProvider>
        </PublicationThemeProvider>
      </Frame>
    </PostDataProvider>
  );
}
