"use client";

import { PublishSmall } from "components/Icons/PublishSmall";
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
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Welcome to Leaflet!"
      className="text-center w-full sm:w-[1000px] sm:max-w-sm text-secondary"
    >
      <div className="accent-container mt-1 p-2 py-4 flex flex-col gap-3 leadingleading-loose">
        <p className="font-bold">
          Start writing right away,
          <br /> no account needed.
        </p>
        <hr className="border-white" />
        <p>
          When you're ready, <br />
          hit{" "}
          <span className="align-middle inline-block">
            <div className=" mb-0.5 flex gap-1 bg-accent-1 w-fit items-center text-white pl-1 pr-1.5 rounded-md font-bold text-sm  ">
              <PublishSmall className="scale-80" /> Publish
            </div>
          </span>{" "}
          to create
          <br /> a new publication.
        </p>
      </div>
      <p className="text-sm text-tertiary pt-2">Happy writing!</p>
    </Modal>
  );
}
