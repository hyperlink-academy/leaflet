import { SpeedyLink } from "components/SpeedyLink";
import { getSection, manualSections } from "./nav";

const cardStyles =
  "flex flex-col gap-1 rounded-md border border-border-light bg-bg-page px-3 py-2 text-primary hover:no-underline! hover:border-border";

// Rendered from the /manual index — every top level section, so the overview
// works as a table of contents.
export function SectionList() {
  return (
    <div className="flex flex-col gap-2">
      {manualSections.map((section) => (
        <SpeedyLink
          key={section.slug}
          href={`/manual/${section.slug}`}
          className={cardStyles}
        >
          <div className="flex gap-2 items-center font-bold">
            <span className="text-tertiary shrink-0">{section.icon}</span>
            {section.name}
          </div>
          {section.pages.length > 0 && (
            <div className="text-sm text-tertiary">
              {section.pages.map((p) => p.name).join(" · ")}
            </div>
          )}
        </SpeedyLink>
      ))}
    </div>
  );
}

// Rendered from each section's index page, under its introduction.
export function SubsectionList(props: { section: string }) {
  let section = getSection(props.section);
  if (!section || section.pages.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {section.pages.map((page) => (
        <SpeedyLink
          key={page.slug}
          href={`/manual/${section.slug}/${page.slug}`}
          className={cardStyles}
        >
          <div className="font-bold">{page.name}</div>
        </SpeedyLink>
      ))}
    </div>
  );
}
