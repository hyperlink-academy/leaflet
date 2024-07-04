import { useReplicache } from "src/replicache";
import { ShareSmall } from "components/Icons";
import { useEffect, useState } from "react";
import { getShareLink } from "./getShareLink";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useSmoker } from "components/Toast";

export function ShareOptions(props: { rootEntity: string }) {
  let { permission_token } = useReplicache();
  let entity_set = useEntitySetContext();
  let [link, setLink] = useState<null | string>(null);
  useEffect(() => {
    if (
      !permission_token.permission_token_rights.find(
        (s) => s.entity_set === entity_set.set && s.create_token,
      )
    )
      return;
    getShareLink(
      { id: permission_token.id, entity_set: entity_set.set },
      props.rootEntity,
    ).then((link) => {
      setLink(link?.id || null);
    });
  }, [entity_set, permission_token, props.rootEntity]);
  let smoker = useSmoker();

  if (
    !permission_token.permission_token_rights.find(
      (s) => s.entity_set === entity_set.set && s.create_token,
    )
  )
    return null;

  return (
    <button
      className="rounded-full w-7 h-7 border border-border"
      onClick={(e) => {
        if (link) {
          navigator.clipboard.writeText(
            `${location.protocol}://${location.host}/${link}`,
          );
          smoker({
            position: { x: e.clientX, y: e.clientY },
            text: "Share link copied",
          });
        }
      }}
    >
      <ShareSmall />
    </button>
  );
}
