"use client";
import { usePathname } from "next/navigation";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { SpeedyLink } from "components/SpeedyLink";
import { manualSections } from "./nav";

// Mirrors ActionButton's plain variant, minus its icon slot — the manual's rows
// are text only, and an empty slot would leave every label indented past a gap.
const navLinkStyles =
  "block shrink-0 rounded-md border py-0.5 px-1 w-full hover:no-underline!";
const activeStyles = "bg-bg-page border-border-light font-bold";

export const ManualNavigation = (props: { onNavigate?: () => void }) => {
  let pathname = usePathname();

  return (
    <>
      <PageTitle pageTitle="Manual" />
      <hr className="border-border-light mb-2" />
      <div className="flex flex-col gap-0.5 grow min-h-0 overflow-y-auto">
        <SpeedyLink
          eager
          href="/manual"
          onClick={props.onNavigate}
          className={`${navLinkStyles} text-secondary ${
            pathname === "/manual"
              ? activeStyles
              : "border-transparent hover:border-border"
          }`}
        >
          Overview
        </SpeedyLink>
        {manualSections.map((section) => {
          let sectionHref = `/manual/${section.slug}`;
          let inSection =
            pathname === sectionHref || pathname.startsWith(`${sectionHref}/`);
          return (
            <div key={section.slug} className="flex flex-col gap-0.5">
              <SpeedyLink
                eager
                href={sectionHref}
                onClick={props.onNavigate}
                className={`${navLinkStyles} text-secondary ${
                  pathname === sectionHref
                    ? activeStyles
                    : "border-transparent hover:border-border"
                }`}
              >
                {section.name}
              </SpeedyLink>
              {inSection && section.pages.length > 0 && (
                <div className="flex flex-col gap-0.5 ml-2 pl-2 my-0.5 border-l border-border-light">
                  {section.pages.map((page) => {
                    let pageHref = `${sectionHref}/${page.slug}`;
                    return (
                      <SpeedyLink
                        key={page.slug}
                        href={pageHref}
                        onClick={props.onNavigate}
                        className={`${navLinkStyles} text-sm ${
                          pathname === pageHref
                            ? `${activeStyles} text-secondary`
                            : "border-transparent text-tertiary hover:border-border"
                        }`}
                      >
                        {page.name}
                      </SpeedyLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
