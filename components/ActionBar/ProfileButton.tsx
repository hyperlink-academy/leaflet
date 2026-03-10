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
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { Modal } from "components/Modal";
import { UpgradeContent } from "app/lish/[did]/[publication]/UpgradeModal";
import { ManageProSubscription } from "app/lish/[did]/[publication]/dashboard/settings/ManageProSubscription";
import { useIsPro } from "src/hooks/useEntitlement";
import { useState } from "react";

export const ProfileButton = () => {
  let { identity } = useIdentityData();
  let { data: record } = useRecordFromDid(identity?.atp_did);
  let isMobile = useIsMobile();
  let [state, setState] = useState<"menu" | "manage-subscription">("menu");
  let isPro = useIsPro();

  return (
    <Popover
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      onOpenChange={() => setState("menu")}
      className="w-xs"
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
          label={record ? record.displayName || record.handle : "Account"}
          className={`w-full`}
        />
      }
    >
      {state === "manage-subscription" ? (
        <ManageProSubscription backToMenu={() => setState("menu")} />
      ) : (
        <div className="flex flex-col gap-0.5">
          {record && (
            <>
              <SpeedyLink
                className="no-underline!"
                href={`/p/${record.handle}`}
              >
                <button
                  type="button"
                  className="menuItem -mx-[8px] text-left flex items-center justify-between hover:no-underline! w-full"
                >
                  View Profile
                </button>
              </SpeedyLink>

              <hr className="border-border-light border-dashed" />
            </>
          )}
          {!isPro ? (
            <Modal
              trigger={
                <div className="menuItem -mx-[8px] text-left flex items-center justify-between hover:no-underline! bg-[var(--accent-light)]! border border-transparent hover:border-accent-contrast">
                  Get Leaflet Pro
                  <ArrowRightTiny />
                </div>
              }
            >
              <UpgradeContent />
            </Modal>
          ) : (
            <button
              className="menuItem -mx-[8px] text-left flex items-center justify-between hover:no-underline!"
              type="button"
              onClick={() => setState("manage-subscription")}
            >
              Manage Pro Subscription
              <ArrowRightTiny />
            </button>
          )}

          <hr className="border-border-light border-dashed" />

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
        </div>
      )}
    </Popover>
  );
};
