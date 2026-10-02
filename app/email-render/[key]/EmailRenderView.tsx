"use client";
import type { AppBskyFeedDefs } from "@atproto/api";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";
import type { PollData } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/fetchPollData";
import { CanvasBlocks } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/CanvasBlockContent";
import { PublicationThemeProvider } from "components/ThemeManager/PublicationThemeProvider";
import { useCardBorderHiddenContext } from "components/ThemeManager/ThemeProvider";
import {
  DocumentProvider,
  type DocumentContextValue,
} from "contexts/DocumentContext";
import { emailRenderSize, type EmailRenderSpec } from "src/emailRender/spec";

// Blocks read interaction counts and the publication from the document; an
// email image shows none of them.
const emptyDocument = {
  uri: "",
  postUrl: "",
  prevNext: null,
  quotesAndMentions: [],
  publication: null,
  normalizedPublication: null,
  commentsCount: 0,
  commentsCountByPage: {},
  mentions: [],
  recommendsCount: 0,
} as unknown as DocumentContextValue;

export function EmailRenderView(props: {
  spec: EmailRenderSpec;
  resources: {
    bskyPostData: AppBskyFeedDefs.PostView[];
    standardSitePostData: StandardSitePostData[];
    pollData: PollData[];
    prerenderedCodeBlocks: Map<string, string>;
  };
}) {
  let { spec } = props;
  return (
    <DocumentProvider
      value={
        {
          ...emptyDocument,
          theme: spec.theme.theme ?? undefined,
        } as DocumentContextValue
      }
    >
      <PublicationThemeProvider record={spec.theme} pub_creator={spec.themeDid}>
        <Frame spec={spec}>
          <CanvasBlocks
            blocks={spec.blocks}
            background={spec.background}
            pattern={spec.pattern}
            size={spec.size}
            did={spec.did}
            pages={spec.pages}
            {...props.resources}
            preview={false}
          />
        </Frame>
      </PublicationThemeProvider>
    </DocumentProvider>
  );
}

// The region at its natural size, scaled to the output image's width and
// pinned to the viewport's top-left corner.
function Frame(props: { spec: EmailRenderSpec; children: React.ReactNode }) {
  let pageBackgroundHidden = useCardBorderHiddenContext();
  let { region, ...output } = emailRenderSize(props.spec);
  return (
    <>
      <style>{`html, body { margin: 0; overflow: hidden; }`}</style>
      <div
        className={pageBackgroundHidden ? "bg-bg-leaflet" : "bg-bg-page"}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: output.width,
          height: output.height,
          overflow: "hidden",
          zIndex: 2147483647,
        }}
      >
        <div
          className="text-primary"
          style={{
            width: region.width,
            height: region.height,
            overflow: "hidden",
            transform: `scale(${output.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {props.children}
        </div>
      </div>
    </>
  );
}
