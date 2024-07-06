import { useReplicache } from "src/replicache";
import { ShareSmall } from "components/Icons";
import { useEffect, useState } from "react";
import { getShareLink } from "./getShareLink";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useSmoker } from "components/Toast";
import * as Popover from "@radix-ui/react-popover";
import { Menu, MenuItem } from "components/Layout";

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
    <Popover.Root>
      <Popover.Trigger>
        <div className="rounded-full w-8 h-8 bg-accent text-accentText flex place-items-center justify-center">
          <ShareSmall />
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6}>
          <Menu>
            <MenuItem
              onClick={(e) => {
                if (link) {
                  navigator.clipboard.writeText(
                    `${location.protocol}://${location.host}/${link}`,
                  );
                  smoker({
                    position: { x: e.clientX, y: e.clientY },
                    text: "Publish link copied!",
                  });
                }
              }}
            >
              <div>
                <div className="font-bold">Publish</div>
                <div className="text-sm text-tertiary">
                  Share a read only version of this doc
                </div>
              </div>
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                if (link) {
                  navigator.clipboard.writeText(`${window.location.href}`);
                  smoker({
                    position: { x: e.clientX, y: e.clientY },
                    text: "Collab link copied!",
                  });
                }
              }}
            >
              <div>
                <div className="font-bold">Collaborate</div>
                <div className="text-sm text-tertiary">
                  Invite people to work together
                </div>
              </div>
            </MenuItem>
          </Menu>

          <Popover.Close />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
