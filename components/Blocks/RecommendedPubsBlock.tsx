import { useIsBlockSelected } from "src/useUIState";
import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, BlockLayout } from "./Block";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { usePublicationRecommendationListings } from "components/Subscribe/useSubscribeSuccessData";
import { RecommendedPubsGrid } from "components/Subscribe/RecommendedPublications";
import { getBasePublicationURL } from "src/utils/getPublicationURL";
import { ToggleWithLabel } from "components/Toggle";
import { BlockSettings } from "./SettingsTriggerButton";
import { EmptyState } from "components/EmptyState";

export const RecommendedPubsBlock = (
  props: BlockProps & { preview?: boolean },
) => {
  let isSelected = useIsBlockSelected(props.entityID);

  if (props.preview) {
    return (
      <BlockLayout
        isSelected={isSelected}
        className="border-none! rounded-none!"
      >
        <RecommendedPubsPlaceholder />
      </BlockLayout>
    );
  }

  return (
    <BlockLayout
      isSelected={isSelected}
      className="border-none! p-0! rounded-none! overflow-visible!"
      inertContent
      extraOptions={<RecommendedPubsSettingsButton entityID={props.entityID} />}
    >
      <RecommendedPubsBlockContent entityID={props.entityID} />
    </BlockLayout>
  );
};

function RecommendedPubsBlockContent({ entityID }: { entityID: string }) {
  let { data } = useLeafletPublicationData();
  let compact = useEntity(entityID, "recommended-pubs/compact")?.data.value;
  let publication = data?.publications;
  let { loading, listings } = usePublicationRecommendationListings(
    publication?.uri,
  );

  if (!publication || loading) return <RecommendedPubsPlaceholder />;

  if (listings.length === 0) {
    let settingsUrl = `${getBasePublicationURL(publication)}/dashboard/settings?tab=general`;
    return (
      <EmptyState
        container="light"
        title="You haven't recommended any publications yet!"
      >
        <div>
          Set up your recommendations in{" "}
          <a
            href={settingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline"
          >
            Publication Settings
          </a>
        </div>
      </EmptyState>
    );
  }

  return (
    <RecommendedPubsGrid
      listings={listings}
      compact={compact}
      subscribeSource={{
        placement: "recommendation",
        publication: publication.uri,
      }}
    />
  );
}

function RecommendedPubsPlaceholder() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 bg-border-light rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

function RecommendedPubsSettingsButton(props: { entityID: string }) {
  let { rep } = useReplicache();
  let compact =
    useEntity(props.entityID, "recommended-pubs/compact")?.data.value ?? false;

  return (
    <BlockSettings label="Recommended Pubs" className="w-xs">
      <ToggleWithLabel
        label="Compact"
        helpText="Show the recommendations in a single side-scrolling row."
        toggle={compact}
        onToggle={() => {
          if (!rep) return;
          rep.mutate.assertFact({
            entity: props.entityID,
            attribute: "recommended-pubs/compact",
            data: { type: "boolean", value: !compact },
          });
        }}
      />
    </BlockSettings>
  );
}
