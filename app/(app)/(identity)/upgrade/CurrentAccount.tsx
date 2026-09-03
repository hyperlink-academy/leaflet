"use client";

import { Avatar } from "components/Avatar";
import { useIdentityData } from "components/IdentityProvider";
import { useRecordFromDid } from "src/utils/useRecordFromDid";

export function CurrentAccount() {
  let { identity } = useIdentityData();
  let { data: record } = useRecordFromDid(identity?.atp_did);

  let name = record?.displayName || record?.handle || identity?.email;

  return (
    <>
      <div className="light-container mx-auto w-full p-2">
        <div className="w-fit mx-auto flex gap-2 items-center min-w-0">
          <Avatar src={record?.avatar} displayName={name} size="medium" />
          <span className="font-bold min-w-0 truncate">
            {name || "Account"}
          </span>
        </div>
      </div>
    </>
  );
}
