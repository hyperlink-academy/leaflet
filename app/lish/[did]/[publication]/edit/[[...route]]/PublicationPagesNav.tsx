"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { SpeedyLink } from "components/SpeedyLink";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { InputWithLabel } from "components/Input";
import { Popover } from "components/Popover";
import { AddTiny } from "components/Icons/AddTiny";
import { createPublicationPage } from "actions/createPublicationPage";
import { usePublicationData } from "../../dashboard/PublicationSWRProvider";
import { sortPublicationPages } from "../../sortPublicationPages";

export function PublicationPagesNav(props: {
  did: string;
  publicationName: string;
}) {
  let router = useRouter();
  let pathname = usePathname();
  let { data, mutate } = usePublicationData();
  let [creating, setCreating] = useState(false);
  let [open, setOpen] = useState(false);
  let [name, setName] = useState("");
  let [path, setPath] = useState("/");

  let pages = data?.publication?.publication_pages ?? [];
  let publicationUri = data?.publication?.uri;

  let baseHref = `/lish/${props.did}/${props.publicationName}`;

  function hrefForPath(path: string | null) {
    let segment = path && path !== "/" ? path : "";
    return `${baseHref}/edit${segment}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (creating || !publicationUri) return;
    let trimmedPath = path.trim();
    if (!trimmedPath) return;
    if (!trimmedPath.startsWith("/")) trimmedPath = "/" + trimmedPath;
    setCreating(true);
    let created = await createPublicationPage({
      publication_uri: publicationUri,
      path: trimmedPath,
      title: name.trim() || undefined,
    });
    setCreating(false);
    if (!created) return;
    setOpen(false);
    setName("");
    setPath("/");
    await mutate();
    router.push(hrefForPath(created.path));
  }

  let sortedPages = sortPublicationPages(pages);

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
        <Popover
          asChild
          align="end"
          open={open}
          onOpenChange={setOpen}
          className="w-64"
          trigger={
            <ButtonSecondary compact>
              <AddTiny className="scale-90" />
              Page
            </ButtonSecondary>
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <InputWithLabel
              label="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              autoFocus
            />
            <InputWithLabel
              label="Path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.currentTarget.value)}
              placeholder="/about"
            />
            <ButtonPrimary type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Page"}
            </ButtonPrimary>
          </form>
        </Popover>
      </div>
    </nav>
  );
}
