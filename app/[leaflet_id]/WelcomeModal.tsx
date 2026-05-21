"use client";

import { Modal } from "components/Modal";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function WelcomeModal() {
  let searchParams = useSearchParams();
  let pathname = usePathname();
  let router = useRouter();
  let [open, setOpen] = useState(searchParams.has("welcomeModal"));

  let handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      let params = new URLSearchParams(searchParams.toString());
      params.delete("welcomeModal");
      let qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange} title="Welcome to Leaflet!">
      <p className="text-secondary">Placeholder welcome content.</p>
    </Modal>
  );
}
