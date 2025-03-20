import { publishtoPublication } from "actions/publishToPublication";
import { useIdentityData } from "components/IdentityProvider";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity, useReplicache } from "src/replicache";

export const AddToPublicationMenu = () => {
  let { identity } = useIdentityData();
  let rep = useReplicache();
  let rootPage = useEntity(rep.rootEntity, "root/page")[0];
  let blocks = useBlocks(rootPage?.data.value);
  if (!identity || identity.publications.length === 0) return null;

  return (
    <div>
      {identity.publications.map((p) => (
        <button
          onClick={() => {
            publishtoPublication(rep.rootEntity, blocks, p.uri);
          }}
        >
          publish to {p.name}
        </button>
      ))}
    </div>
  );
};
