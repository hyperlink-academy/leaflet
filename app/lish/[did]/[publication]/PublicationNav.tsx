import { SpeedyLink } from "components/SpeedyLink";

export type PublicationNavPage = {
  id: number;
  path: string | null;
  title: string | null;
};

export function PublicationNav(props: {
  did: string;
  publicationName: string;
  pages: PublicationNavPage[];
  activePath: string | null;
}) {
  if (props.pages.length === 0) return null;

  let baseHref = `/lish/${props.did}/${props.publicationName}`;

  let sortedPages = [...props.pages].sort((a, b) => {
    let aHome = a.path === "/" ? 0 : 1;
    let bHome = b.path === "/" ? 0 : 1;
    if (aHome !== bHome) return aHome - bHome;
    return (a.path ?? "").localeCompare(b.path ?? "");
  });

  let homeActive = props.activePath === null || props.activePath === "/";

  return (
    <nav className="publicationNav border-b border-border-light w-full mx-auto">
      <div className="flex items-center gap-1 px-3 sm:px-4 py-2 overflow-x-auto sm:max-w-(--page-width-units) mx-auto">
        <SpeedyLink
          href={baseHref}
          className={`shrink-0 px-2 py-1 rounded-md text-sm hover:no-underline! ${
            homeActive
              ? "bg-accent-1 text-accent-2"
              : "text-secondary hover:bg-border-light"
          }`}
        >
          Posts
        </SpeedyLink>
        {sortedPages.map((page) => {
          if (!page.path) return null;
          let segment = page.path === "/" ? "" : page.path;
          let href = `${baseHref}${segment}`;
          let active = props.activePath === page.path;
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
              {page.title || page.path}
            </SpeedyLink>
          );
        })}
      </div>
    </nav>
  );
}
