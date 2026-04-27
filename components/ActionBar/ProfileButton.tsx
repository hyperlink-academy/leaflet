import { Avatar } from "components/Avatar";
import { ActionButton } from "./ActionButton";
import { useIdentityData } from "components/IdentityProvider";
import { AccountSmall } from "components/Icons/AccountSmall";
import { useRecordFromDid } from "src/utils/useRecordFromDid";
import { useIsMobile } from "src/hooks/isMobile";
import { LogoutSmall } from "components/Icons/LogoutSmall";
import { mutate } from "swr";
import { SpeedyLink } from "components/SpeedyLink";
import { Popover } from "components/Popover";
import { Modal } from "components/Modal";
import { InlineUpgradeToPro } from "app/lish/[did]/[publication]/UpgradeModal";
import { ManageProSubscription } from "app/lish/[did]/[publication]/dashboard/settings/ProSettings";
import { ManageDomains } from "components/Domains/ManageDomains";
import { WebSmall } from "components/Icons/WebSmall";
import { useIsPro, useCanSeePro } from "src/hooks/useEntitlement";
import { useState } from "react";
import { LeafletPro } from "components/Icons/LeafletPro";

export const ProfileButton = () => {
  let { identity } = useIdentityData();
  let { data: record } = useRecordFromDid(identity?.atp_did);
  let isMobile = useIsMobile();
  let isPro = useIsPro();
  let canSeePro = useCanSeePro();

  return (
    <Popover
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="w-xs py-1!"
      trigger={
        <ActionButton
          nav
          labelOnMobile={false}
          icon={
            record ? (
              <Avatar
                src={record.avatar}
                displayName={record.displayName || record.handle}
              />
            ) : (
              <AccountSmall />
            )
          }
          label={
            record
              ? record.displayName || record.handle
              : identity?.email || "Account"
          }
          className={`w-full`}
        />
      }
    >
      <div className="flex flex-col gap-0.5">
        {record && (
          <>
            <SpeedyLink
              className="no-underline! menuItem -mx-[8px]"
              href={`/p/${record.handle}`}
            >
              <button type="button" className="flex gap-2 ">
                <AccountSmall />
                View Profile
              </button>
            </SpeedyLink>
          </>
        )}

        <ManageDomains />
        <hr className="border-border-light border-dashed" />

        {canSeePro && isPro && (
          <>
            <Modal
              trigger={
                <div className="menuItem -mx-[8px] ">
                  <LeafletPro />
                  Manage Pro Subscription
                </div>
              }
            >
              <ManageProSubscription />
            </Modal>
            <hr className="border-border-light border-dashed" />
          </>
        )}
        <button
          type="button"
          className="menuItem -mx-[8px] text-left flex items-center gap-2 hover:no-underline!"
          onClick={async () => {
            await fetch("/api/auth/logout");
            mutate("identity", null);
          }}
        >
          <LogoutSmall />
          Log Out
        </button>
        {canSeePro && !isPro && (
          <>
            {" "}
            <hr className="border-border-light border-dashed" />
            <div className="py-2">
              <div className="p-2 accent-container">
                <InlineUpgradeToPro compact />
              </div>
            </div>
          </>
        )}
      </div>
    </Popover>
  );
};
