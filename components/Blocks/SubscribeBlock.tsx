import { useUIState } from "src/useUIState";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { usePublicationData } from "app/(app)/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
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
  let { normalizedPublication } = useLeafletPublicationData();
  let { data } = usePublicationData();
  let publicationUri = data?.publication?.uri;
  let newsletterMode =
    !!data?.publication?.publication_newsletter_settings?.enabled;

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
