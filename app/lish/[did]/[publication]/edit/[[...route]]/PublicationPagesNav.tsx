"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { SpeedyLink } from "components/SpeedyLink";
import { ButtonSecondary } from "components/Buttons";
import { AddTiny } from "components/Icons/AddTiny";
import { createPublicationPage } from "actions/createPublicationPage";
import { usePublicationData } from "../../dashboard/PublicationSWRProvider";

export function PublicationPagesNav(props: {
  did: string;
  publicationName: string;
}) {
  let router = useRouter();
  let pathname = usePathname();
  let { data, mutate } = usePublicationData();
  let [creating, setCreating] = useState(false);

  let pages = data?.publication?.publication_pages ?? [];
  let publicationUri = data?.publication?.uri;

  let baseHref = `/lish/${props.did}/${props.publicationName}`;

  function hrefForPath(path: string | null) {
    let segment = path && path !== "/" ? path : "";
    return `${baseHref}/edit${segment}`;
  }

  async function handleCreate() {
    if (creating || !publicationUri) return;
    let path = window.prompt("New page path (e.g. /about):", "/");
    if (!path) return;
    if (!path.startsWith("/")) path = "/" + path;
    setCreating(true);
    let created = await createPublicationPage({
      publication_uri: publicationUri,
      path,
    });
    setCreating(false);
    if (!created) return;
    await mutate();
    router.push(hrefForPath(created.path));
  }

  let sortedPages = [...pages].sort((a, b) => {
    let ap = a.path === "/" ? 0 : 1;
    let bp = b.path === "/" ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return (a.path ?? "").localeCompare(b.path ?? "");
  });

  return (
    <nav className="publicationPagesNav border-t border-b border-border-light shrink-0 w-full sm:max-w-[calc(var(--page-width-units)*1.25)] mx-auto">
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 overflow-x-auto w-full sm:max-w-(--page-width-units) mx-auto">
        <div className="flex items-center gap-1 grow min-w-0 overflow-x-auto">
          {sortedPages.map((page) => {
            let href = hrefForPath(page.path);
            let active =
              decodeURIComponent(pathname) === decodeURIComponent(href);
            return (
              <SpeedyLink
                key={page.id}
                href={href}
                className={`shrink-0 px-2 py-1 rounded-md text-sm hover:no-underline! ${
                  active
                    ? "bg-accent-1 text-accent-2"
                    : "text-secondary hover:bg-border-light"
                }`}
              >
                {page.title || page.path || "/"}
              </SpeedyLink>
            );
          })}
        </div>
        <ButtonSecondary compact onClick={handleCreate} disabled={creating}>
          <AddTiny className="scale-90" />
          {creating ? "Creating..." : "Page"}
        </ButtonSecondary>
      </div>
    </nav>
  );
}
