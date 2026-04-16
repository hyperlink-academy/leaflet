import { atUriToUrl, classifyAtUri } from "src/utils/mentionUtils";

/**
 * Component for rendering at-uri mentions (publications and documents) as clickable links.
 * NOTE: This component's styling and behavior should match the ProseMirror schema rendering
 * in components/Blocks/TextBlock/schema.ts (atMention mark). If you update one, update the other.
 */
export function AtMentionLink({
  atURI,
  href,
  icon: iconUrl,
  children,
  className = "",
}: {
  atURI: string;
  href?: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { isPublication, isDocument } = classifyAtUri(atURI);

  // Show publication icon, or service-provided icon
  const iconSrc =
    isPublication || isDocument
      ? `/api/pub_icon?at_uri=${encodeURIComponent(atURI)}`
      : iconUrl ?? null;

  const icon = iconSrc ? (
    <img
      src={iconSrc}
      className="inline-block w-4 h-4 rounded-full mr-1 mt-[3px] align-text-top"
      alt=""
      width="20"
      height="20"
      loading="lazy"
    />
  ) : null;

  const linkHref = href || atUriToUrl(atURI);

  return (
    <a
      href={linkHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`mention ${isPublication ? "font-bold" : ""} ${isDocument ? "italic" : ""} ${className}`}
    >
      {icon}
      {children}
    </a>
  );
}
