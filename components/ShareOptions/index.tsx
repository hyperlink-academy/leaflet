import { useReplicache } from "src/replicache";
import { ShareSmall } from "components/Icons";
import { useEffect, useState } from "react";
import { getShareLink } from "./getShareLink";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useSmoker } from "components/Toast";
import { Menu, MenuItem } from "components/Layout";
import { HoverButton } from "components/Buttons";

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
    <Menu
      trigger={
        <HoverButton
          icon=<ShareSmall />
          label="Share"
          background="bg-accent-1"
          text="text-accent-2"
        />
      }
    >
      <MenuItem
        id="get-publish-link"
        onSelect={(event) => {
          event.preventDefault();
          let rect = document
            .getElementById("get-publish-link")
            ?.getBoundingClientRect();
          if (link) {
            navigator.clipboard.writeText(
              `${location.protocol}//${location.host}/${link}`,
            );
            smoker({
              position: {
                x: rect ? rect.left + 80 : 0,
                y: rect ? rect.top + 26 : 0,
              },
              text: "Publish link copied!",
            });
          }
        }}
      >
        <div className="group/publish">
          <div className=" group-hover/publish:text-accent-contrast">
            Publish
          </div>
          <div className="text-sm font-normal text-tertiary group-hover/publish:text-accent-contrast">
            Share a read only version of this doc
          </div>
        </div>
      </MenuItem>
      <MenuItem
        id="get-collab-link"
        onSelect={(event) => {
          event.preventDefault();
          let rect = document
            .getElementById("get-collab-link")
            ?.getBoundingClientRect();
          if (link) {
            navigator.clipboard.writeText(`${window.location.href}`);
            smoker({
              position: {
                x: rect ? rect.left + 80 : 0,
                y: rect ? rect.top + 26 : 0,
              },
              text: "Collab link copied!",
            });
          }
        }}
      >
        <div className="group/collab">
          <div className="group-hover/collab:text-accent-contrast">
            Collaborate
          </div>
          <div className="text-sm font-normal text-tertiary group-hover/collab:text-accent-contrast">
            Invite people to work together
          </div>
        </div>
      </MenuItem>{" "}
    </Menu>
  );
}
