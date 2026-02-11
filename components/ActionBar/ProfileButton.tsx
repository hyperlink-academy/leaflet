import { Avatar } from "components/Avatar";
import { ActionButton } from "./ActionButton";
import { useIdentityData } from "components/IdentityProvider";
import { AccountSmall } from "components/Icons/AccountSmall";
import { useRecordFromDid } from "src/utils/useRecordFromDid";
import { Menu, MenuItem } from "components/Menu";
import { useIsMobile } from "src/hooks/isMobile";
import { LogoutSmall } from "components/Icons/LogoutSmall";
import { mutate } from "swr";
import { SpeedyLink } from "components/SpeedyLink";

export const ProfileButton = () => {
  let { identity } = useIdentityData();
  let { data: record } = useRecordFromDid(identity?.atp_did);
  let isMobile = useIsMobile();

  return (
    <Menu
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
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
      {record && (
        <>
          <SpeedyLink href={`/p/${record.handle}`}>
            <MenuItem onSelect={() => {}}>View Profile</MenuItem>
          </SpeedyLink>

          <hr className="border-border-light border-dashed" />
        </>
      )}
      <MenuItem
        onSelect={async () => {
          await fetch("/api/auth/logout");
          mutate("identity", null);
        }}
      >
        <LogoutSmall />
        Log Out
      </MenuItem>
    </Menu>
  );
};
