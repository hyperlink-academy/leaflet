import { InfoSmall } from "components/Icons/InfoSmall";
import { WriterSmall } from "components/Icons/WriterSmall";
import { PublishSmall } from "components/Icons/PublishSmall";
import { SubscribersSmall } from "components/Icons/SubscribersSmall";
import { ReaderReadSmall } from "components/Icons/ReaderSmall";
import { LeafletPro } from "components/Icons/LeafletPro";
import { PostListSmall } from "components/Icons/PostListSmall";
import { SettingsSmall } from "components/Icons/SettingsSmall";

export type ManualSection = {
  slug: string;
  name: string;
  icon: React.ReactNode;
  pages: { slug: string; name: string }[];
};

export const manualSections: ManualSection[] = [
  {
    slug: "getting-started",
    name: "Getting Started",
    icon: <InfoSmall />,
    pages: [],
  },
  {
    slug: "writing",
    name: "Writing",
    icon: <WriterSmall />,
    pages: [
      { slug: "documents", name: "Documents" },
      { slug: "blocks", name: "Blocks" },
      { slug: "collaboration-and-sharing", name: "Collaboration and Sharing" },
    ],
  },
  {
    slug: "publishing",
    name: "Publishing",
    icon: <PublishSmall />,
    pages: [
      {
        slug: "publications-and-looseleafs",
        name: "Publications and Looseleafs",
      },
      { slug: "publication-dashboard", name: "Publication Dashboard" },
      { slug: "customization", name: "Customization" },
      { slug: "publishing-and-sharing", name: "Publishing and Sharing" },
      { slug: "monetization", name: "Monetization" },
    ],
  },
  {
    slug: "social-features",
    name: "Social Features",
    icon: <SubscribersSmall />,
    pages: [
      { slug: "subscriptions", name: "Subscriptions" },
      { slug: "recommendations", name: "Recommendations" },
      { slug: "comments", name: "Comments" },
      { slug: "sharing", name: "Sharing" },
    ],
  },
  {
    slug: "reading",
    name: "Reading",
    icon: <ReaderReadSmall />,
    pages: [
      { slug: "profiles", name: "Profiles" },
      { slug: "reader", name: "Reader" },
    ],
  },
  {
    slug: "leaflet-pro",
    name: "Leaflet Pro",
    icon: <LeafletPro />,
    pages: [
      { slug: "analytics", name: "Analytics" },
      { slug: "email-newsletters", name: "Email Newsletters" },
      { slug: "group-publications", name: "Group Publications" },
    ],
  },
  {
    slug: "guides",
    name: "Guides",
    icon: <PostListSmall />,
    pages: [
      {
        slug: "make-your-first-publication",
        name: "Make your first publication",
      },
      {
        slug: "publishing-a-one-off-looseleaf",
        name: "Publishing a one off Looseleaf",
      },
      {
        slug: "starting-an-email-newsletter",
        name: "Starting an email newsletter",
      },
      {
        slug: "starting-a-paid-newsletter",
        name: "Starting a paid newsletter",
      },
      {
        slug: "migrating-an-existing-newsletter",
        name: "Migrating an existing newsletter",
      },
    ],
  },
  {
    slug: "advanced-topics",
    name: "Advanced Topics",
    icon: <SettingsSmall />,
    pages: [
      { slug: "data-ownership", name: "Data ownership" },
      { slug: "standard-site", name: "Standard Site" },
    ],
  },
];

export function getSection(slug: string) {
  return manualSections.find((s) => s.slug === slug);
}

// Longest-prefix match so a leaf page (/manual/writing/blocks) resolves to its
// own entry rather than only to the section it lives under.
export function findManualPage(pathname: string) {
  for (let section of manualSections) {
    let sectionHref = `/manual/${section.slug}`;
    if (pathname === sectionHref) return { section, page: null };
    for (let page of section.pages) {
      if (pathname === `${sectionHref}/${page.slug}`) return { section, page };
    }
  }
  return null;
}

// Every page flattened into reading order, so the prev/next links walk the
// whole manual rather than stopping at each section's boundary.
export const manualReadingOrder: { href: string; name: string }[] = [
  { href: "/manual", name: "Overview" },
  ...manualSections.flatMap((section) => [
    { href: `/manual/${section.slug}`, name: section.name },
    ...section.pages.map((page) => ({
      href: `/manual/${section.slug}/${page.slug}`,
      name: page.name,
    })),
  ]),
];

export function getAdjacentPages(pathname: string) {
  let index = manualReadingOrder.findIndex((e) => e.href === pathname);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: manualReadingOrder[index - 1] ?? null,
    next: manualReadingOrder[index + 1] ?? null,
  };
}
