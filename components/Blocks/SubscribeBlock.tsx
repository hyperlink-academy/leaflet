import { useUIState } from "src/useUIState";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { BlockProps, BlockLayout } from "./Block";
import { SubscribeInput } from "components/Subscribe/SubscribeButton";

// SubscribeBlock renders the publication subscribe form in the editor, styled to
// match SubscribePanel (components/Subscribe/SubscribeButton.tsx). The published
// page renders the same form via PostContent.tsx's signup case.
export const SubscribeBlock = (
  props: BlockProps & {
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  // Source publication data from the leaflet editor's provider — the dashboard
  // PublicationSWRProvider (usePublicationData) isn't mounted in the post
  // editor, so reading newsletter settings from it always came back empty and
  // the block fell back to atproto-only subscribe. The published page reads the
  // same data from getPostPageData via DocumentContext.
  let { data, normalizedPublication } = useLeafletPublicationData();
  let publicationUri = data?.publications?.uri;
  let newsletterMode =
    !!data?.publications?.publication_newsletter_settings?.enabled;

  let publicationName = normalizedPublication?.name || "Subscribe";
  let publicationDescription = normalizedPublication?.description;

  return (
    <BlockLayout
      isSelected={!!isSelected}
      areYouSure={props.areYouSure}
      setAreYouSure={props.setAreYouSure}
      className="accent-container rounded-lg! border-none! p-0! text-center justify-center"
    >
      <div className="px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5">
        <h3 className="leading-snug text-secondary">{publicationName}</h3>
        {publicationDescription && (
          <div className="text-tertiary">{publicationDescription}</div>
        )}
        <div className="w-fit max-w-full mx-auto pt-3">
          {publicationUri && (
            <SubscribeInput
              publicationUri={publicationUri}
              publicationUrl={normalizedPublication?.url}
              publicationName={publicationName}
              publicationDescription={publicationDescription}
              newsletterMode={newsletterMode}
            />
          )}
        </div>
      </div>
    </BlockLayout>
  );
};
