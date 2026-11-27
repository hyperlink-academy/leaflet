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
        isSelected={false}
        className="accent-container rounded-lg! border-none! p-0! text-center justify-center"
      >
        <div className="flex flex-col items-center gap-3 px-4 py-4 leading-snug">
          <div>
            <h3 className="leading-tight pb-1">{publicationName}</h3>
            {publicationDescription && <p>{publicationDescription}</p>}
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
      <div className="flex flex-col items-center gap-3 px-4 py-4 leading-snug">
        <div>
          <h3 className="leading-tight pb-1">{publicationName}</h3>
          {publicationDescription && <p>{publicationDescription}</p>}
        </div>
        <div className="w-fit max-w-full mx-auto">
          {publicationUri && (
            <SubscribeInput
              publicationUri={publicationUri}
              publicationUrl={normalizedPublication?.url}
              source={{ placement: "editor" }}
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
