import { SpeedyLink } from "components/SpeedyLink";

// A single tab link in a publication nav, shared between the public nav
// (PublicationNav) and the editor nav (PublicationPagesEditNav) so the two
// stay visually identical. External link tabs open off-site in a new window;
// hosted pages navigate client-side.
export function PublicationNavTabLink(props: {
  href: string;
  external: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  let className = `block px-1 pt-1 pb-0.5 text-sm font-bold text-inherit no-underline! select-none border-b-3 ${
    props.active ? "border-accent-contrast" : "border-transparent"
  }`;
  if (props.external)
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {props.children}
      </a>
    );
  return (
    <SpeedyLink href={props.href} className={className}>
      {props.children}
    </SpeedyLink>
  );
}
