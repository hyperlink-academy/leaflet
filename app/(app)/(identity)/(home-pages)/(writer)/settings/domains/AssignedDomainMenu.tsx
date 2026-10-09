"use client";
import { useState } from "react";
import { Menu, MenuItem, MenuSeparator } from "components/Menu";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { UnlinkTiny } from "components/Icons/UnlinkTiny";
import { UnassignModal } from "./UnassignButton";
import { DeleteDomainModal } from "./DeleteDomainButton";
import { DomainVerificationDetailsModal } from "./DomainVerification";
import { DeleteTiny } from "components/Icons/DeleteTiny";
import { CheckTiny } from "components/Icons/CheckTiny";

export function AssignedDomainMenu(props: {
  domain: string;
  unlinkLabel: string;
  linkedItem: string | undefined;
  onUnassign: () => void;
}) {
  let [modal, setModal] = useState<"unassign" | "verification" | "delete">();
  let modalProps = (name: typeof modal) => ({
    open: modal === name,
    onOpenChange: (open: boolean) => setModal(open ? name : undefined),
  });

  return (
    <>
      <Menu
        align="end"
        trigger={
          <div className="text-secondary hover:text-accent-contrast shrink-0">
            <MoreOptionsVerticalTiny />
          </div>
        }
      >
        <MenuItem
          className="items-center"
          onSelect={() => setModal("unassign")}
        >
          <UnlinkTiny />
          {props.unlinkLabel}
        </MenuItem>
        <MenuItem
          className="items-center"
          onSelect={() => setModal("verification")}
        >
          <CheckTiny />
          See verification details
        </MenuItem>
        <MenuSeparator />
        <MenuItem className="items-center" onSelect={() => setModal("delete")}>
          <DeleteTiny />
          Delete
        </MenuItem>
      </Menu>
      <UnassignModal
        domain={props.domain}
        linkedItem={props.linkedItem}
        onUnassign={props.onUnassign}
        {...modalProps("unassign")}
      />
      <DomainVerificationDetailsModal
        domain={props.domain}
        {...modalProps("verification")}
      />
      <DeleteDomainModal domain={props.domain} {...modalProps("delete")} />
    </>
  );
}
