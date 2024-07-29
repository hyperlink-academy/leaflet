import { useReplicache } from "src/replicache";
import { PopoverArrow, ShareSmall } from "components/Icons";
import { useEffect, useState } from "react";
import { getShareLink } from "./getShareLink";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useSmoker } from "components/Toast";
import * as Popover from "@radix-ui/react-popover";
import { Menu, MenuItem } from "components/Layout";
import { theme } from "tailwind.config";

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
        <div className="sm:w-8 sm:h-8 relative">
          <div className="z-10 group/share sm:absolute top-0 left-0 rounded-full w-fit h-max bg-accent-1 text-accent-2 flex gap-2 p-1 place-items-center justify-center">
            <ShareSmall />
            <div className="font-bold pr-[6px] sm:hidden group-hover/share:block">
              Share
            </div>
          </div>
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-20"
          align="center"
          sideOffset={4}
          collisionPadding={16}
        >
          <Menu>
            <MenuItem
              onClick={(e) => {
                if (link) {
                  navigator.clipboard.writeText(
                    `${location.protocol}//${location.host}/${link}`,
                  );
                  smoker({
                    position: { x: e.clientX, y: e.clientY },
                    text: "Publish link copied!",
                  });
                }
              }}
            >
              <div className="group/publish">
                <div className="font-bold group-hover/publish:text-accent-contrast">
                  Publish
                </div>
                <div className="text-sm text-tertiary group-hover/publish:text-accent-contrast">
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
              <div className="group/collab">
                <div className="font-bold group-hover/collab:text-accent-contrast">
                  Collaborate
                </div>
                <div className="text-sm text-tertiary group-hover/collab:text-accent-contrast">
                  Invite people to work together
                </div>
              </div>
            </MenuItem>
          </Menu>
          <Popover.Arrow asChild width={16} height={8} viewBox="0 0 16 8">
            <PopoverArrow
              arrowFill={theme.colors["bg-card"]}
              arrowStroke={theme.colors["border"]}
            />
          </Popover.Arrow>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
