"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useIdentityData } from "./IdentityProvider";
import { Modal } from "./Modal";

export function SubscriptionSuccessModal() {
  let searchParams = useSearchParams();
  let router = useRouter();
  let pathname = usePathname();
  let { identity, mutate } = useIdentityData();
  let [open, setOpen] = useState(false);
  let [loading, setLoading] = useState(true);

  let isUpgradeSuccess = searchParams.get("upgrade") === "success";

  useEffect(() => {
    if (!isUpgradeSuccess) return;
    setOpen(true);
    setLoading(true);
    mutate().then(() => setLoading(false));
  }, [isUpgradeSuccess]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      let params = new URLSearchParams(searchParams.toString());
      params.delete("upgrade");
      let qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }

  if (!isUpgradeSuccess && !open) return null;

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      trigger={<span />}
      title="Welcome to Pro"
      className="w-80"
    >
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent-contrast" />
          <p className="text-secondary text-sm">
            Activating your subscription...
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 py-2">
          <p className="text-secondary text-sm">
            Your Pro subscription is active. Thanks for supporting Leaflet!
          </p>
        </div>
      )}
    </Modal>
  );
}
