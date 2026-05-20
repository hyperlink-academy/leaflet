import { SpeedyLink } from "components/SpeedyLink";

export type PublicationNavPage = {
  id: number;
  path: string | null;
  title: string | null;
};

export function PublicationNav(props: {
  publicationUrl: string;
  pages: PublicationNavPage[];
  activePath: string | null;
}) {
  if (props.pages.length === 0) return null;

  let sortedPages = [...props.pages].sort((a, b) => {
    let aHome = a.path === "/" ? 0 : 1;
    let bHome = b.path === "/" ? 0 : 1;
    if (aHome !== bHome) return aHome - bHome;
    return (a.path ?? "").localeCompare(b.path ?? "");
  });

  return (
    <nav className="publicationNav border-t border-b border-border-light w-full sm:max-w-[calc(var(--page-width-units)*1.25)] mx-auto">
      <div className="flex items-center gap-1 px-2 sm:px-3 py-1 overflow-x-auto sm:max-w-(--page-width-units) mx-auto">
        {sortedPages.map((page) => {
          if (!page.path) return null;
          let segment = page.path === "/" ? "" : page.path;
          let href = `${props.publicationUrl}${segment}`;
          let active = props.activePath === page.path;
          return (
            <SpeedyLink
              key={page.id}
              href={href}
              className={`shrink-0 px-2 py-0.5 rounded-md text-sm hover:no-underline! ${
                active
                  ? "bg-accent-1 text-accent-2 font-semibold"
                  : "text-secondary"
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
