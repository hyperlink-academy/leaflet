import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { PubLeafletPublication } from "lexicons/api";
import { useEntity, useReplicache } from "src/replicache";

export function useCardBorderHidden(entityID: string | null) {
  let { rootEntity } = useReplicache();
  let { data: pub } = useLeafletPublicationData();
  let rootCardBorderHidden = useEntity(rootEntity, "theme/card-border-hidden");

  let cardBorderHidden =
    useEntity(entityID, "theme/card-border-hidden") || rootCardBorderHidden;
  if (!cardBorderHidden && !rootCardBorderHidden) {
    if (pub?.publications?.record) {
      let record = pub.publications.record as PubLeafletPublication.Record;
      return !record.theme?.showPageBackground;
    }
    return false;
  }
  return (cardBorderHidden || rootCardBorderHidden)?.data.value;
}
