import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useEntity, useReplicache } from "src/replicache";

export function useCardBorderHidden(entityID: string) {
  let { rootEntity } = useReplicache();
  let { data } = useLeafletPublicationData();
  let rootCardBorderHidden = useEntity(rootEntity, "theme/card-border-hidden");

  let cardBorderHidden =
    useEntity(entityID, "theme/card-border-hidden") || rootCardBorderHidden;
  console.log(cardBorderHidden, rootCardBorderHidden);
  if (!cardBorderHidden && !rootCardBorderHidden) {
    if (data?.[0]) return true;
    return false;
  }
  return (cardBorderHidden || rootCardBorderHidden)?.data.value;
}
