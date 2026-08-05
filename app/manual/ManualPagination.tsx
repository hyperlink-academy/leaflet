"use client";
import { usePathname } from "next/navigation";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { SpeedyLink } from "components/SpeedyLink";
import { getAdjacentPages } from "./nav";

export function ManualPagination() {
  let pathname = usePathname();
  let { previous, next } = getAdjacentPages(pathname);
  if (!previous && !next) return null;

  return (
    <div className="flex gap-2 items-stretch mt-6 pt-3 border-t border-border-light">
      {previous ? (
        <SpeedyLink
          href={previous.href}
          className="basis-0 grow flex gap-2 items-center rounded-md border border-border-light bg-bg-page px-3 py-2 text-primary hover:no-underline! hover:border-border"
        >
          <ArrowRightTiny className="rotate-180 shrink-0 text-tertiary" />
          <div className="min-w-0">
            <div className="text-sm text-tertiary">Previous</div>
            <div className="font-bold">{previous.name}</div>
          </div>
        </SpeedyLink>
      ) : (
        <div className="basis-0 grow" />
      )}
      {next ? (
        <SpeedyLink
          href={next.href}
          className="basis-0 grow flex gap-2 items-center justify-end text-right rounded-md border border-border-light bg-bg-page px-3 py-2 text-primary hover:no-underline! hover:border-border"
        >
          <div className="min-w-0">
            <div className="text-sm text-tertiary">Next</div>
            <div className="font-bold">{next.name}</div>
          </div>
          <ArrowRightTiny className="shrink-0 text-tertiary" />
        </SpeedyLink>
      ) : (
        <div className="basis-0 grow" />
      )}
    </div>
  );
}
