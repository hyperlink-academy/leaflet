import { useIsBlockSelected } from "src/useUIState";
import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, BlockLayout } from "./Block";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import {
  PublicationMetadata,
  PublicationMetadataPreview,
} from "components/Pages/PublicationMetadata";
import { ToggleWithLabel } from "components/Toggle";
import { BlockSettings } from "./SettingsTriggerButton";

// The post's header (publication, title, description, byline) as a movable
// canvas block. It renders the same PublicationMetadata a linear document
// shows above its blocks; the published page renders the post's PostHeader in
// its place (PostContent.tsx's postHeader case).
export const PostHeaderBlock = (
  props: BlockProps & {
    preview?: boolean;
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) => {
  let isSelected = useIsBlockSelected(props.entityID);
  let compact =
    useEntity(props.entityID, "post-header/compact")?.data.value ?? false;
  let { data } = useLeafletPublicationData();
  let className = "p-0! overflow-visible! bg-bg-page";

  if (props.preview)
    return (
      <BlockLayout isSelected={false} className={className}>
        <PublicationMetadataPreview compact={compact} />
      </BlockLayout>
    );

  return (
    <BlockLayout
      isSelected={!!isSelected}
      areYouSure={props.areYouSure}
      setAreYouSure={props.setAreYouSure}
      className={className}
      extraOptions={<PostHeaderSettingsButton entityID={props.entityID} />}
    >
      {data?.publications ? (
        <PublicationMetadata compact={compact} />
      ) : (
        <div className="px-3 py-2 sm:px-4 text-sm text-tertiary italic">
          The post title appears here once this doc is in a publication.
        </div>
      )}
    </BlockLayout>
  );
};

function PostHeaderSettingsButton(props: { entityID: string }) {
  let { rep } = useReplicache();
  let compact =
    useEntity(props.entityID, "post-header/compact")?.data.value ?? false;

  return (
    <BlockSettings label="Post Title" className="w-xs">
      <ToggleWithLabel
        label="Compact"
        helpText="Show just the title and byline, without the description."
        toggle={compact}
        onToggle={() => {
          if (!rep) return;
          rep.mutate.assertFact({
            entity: props.entityID,
            attribute: "post-header/compact",
            data: { type: "boolean", value: !compact },
          });
        }}
      />
    </BlockSettings>
  );
}
