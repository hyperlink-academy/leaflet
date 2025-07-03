import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { PubLeafletPublication } from "lexicons/api";
import { useEntity, useReplicache } from "src/replicache";

export function useCardBorderHidden(entityID: string) {
  let { rootEntity } = useReplicache();
  let { data: pub } = useLeafletPublicationData();
  let rootCardBorderHidden = useEntity(rootEntity, "theme/card-border-hidden");

  let cardBorderHidden =
    useEntity(entityID, "theme/card-border-hidden") || rootCardBorderHidden;
  if (!cardBorderHidden && !rootCardBorderHidden) {
    if (pub?.publications) {
      let record = pub.publications.record as PubLeafletPublication.Record;
      if (record.theme?.backgroundImage) return false;
      return true;
    }
    return false;
  }
  return (cardBorderHidden || rootCardBorderHidden)?.data.value;
}
