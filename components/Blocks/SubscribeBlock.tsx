import { useIsBlockSelected } from "src/useUIState";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { BlockProps, BlockLayout } from "./Block";
import { SubscribeInput } from "components/Subscribe/SubscribeButton";

// SubscribeBlock renders the publication subscribe form in the editor, styled to
// match SubscribePanel (components/Subscribe/SubscribeButton.tsx). The published
// page renders the same form via PostContent.tsx's signup case.
export const SubscribeBlock = (
  props: BlockProps & {
    preview?: boolean;
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) => {
  let isSelected = useIsBlockSelected(props.entityID);
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

  if (props.preview)
    return (
      <BlockLayout
        isSelected={!!isSelected}
        className="accent-container rounded-lg! border-none! p-0! text-center justify-center"
      >
        <div className="px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5">
          <h3 className="leading-snug text-secondary">{publicationName}</h3>
          {publicationDescription && (
            <div className="text-tertiary">{publicationDescription}</div>
          )}
          <div className="w-fit max-w-full mx-auto pt-3">
            <div className="max-w-sm w-full mx-auto">
              <div className="input-with-border flex gap-2 w-full items-center mx-auto py-0! min-w-0 bg-bg-page text-primary">
                <div className="grow min-w-0 py-0.5 text-left text-tertiary">
                  email@example.com
                </div>
                <div className="text-accent-contrast flex items-center shrink-0">
                  <div className="m-0 h-max w-max py-0 px-1 bg-accent-1 border border-accent-1 rounded-md font-bold text-accent-2 flex gap-2 items-center justify-center shrink-0 text-sm leading-tight">
                    Subscribe
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BlockLayout>
    );

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
