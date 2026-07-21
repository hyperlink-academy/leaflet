import React from "react";
import { LockTiny } from "components/Icons/LockTiny";

export function MembersBadge() {
  return (
    <span className="membersBadge inline-flex items-center gap-0.5 align-middle ml-1.5 text-xs font-bold text-accent-contrast whitespace-nowrap">
      <LockTiny className="w-3 h-3 shrink-0" />
      Members
    </span>
  );
}
