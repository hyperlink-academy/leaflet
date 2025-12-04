import { AtUri } from "@atproto/api";
import { atUriToUrl } from "src/utils/mentionUtils";

/**
 * Component for rendering at-uri mentions (publications and documents) as clickable links.
 * NOTE: This component's styling and behavior should match the ProseMirror schema rendering
 * in components/Blocks/TextBlock/schema.ts (atMention mark). If you update one, update the other.
 */
export function AtMentionLink({
  atURI,
  children,
  className = "",
}: {
  atURI: string;
  children: React.ReactNode;
  className?: string;
}) {
  const aturi = new AtUri(atURI);
  const isPublication = aturi.collection === "pub.leaflet.publication";
  const isDocument = aturi.collection === "pub.leaflet.document";

  // Show publication icon if available
  const icon =
    isPublication || isDocument ? (
      <img
        src={`/api/pub_icon?at_uri=${encodeURIComponent(atURI)}`}
        className="inline-block w-5 h-5 rounded-full mr-1 align-text-top"
        alt=""
        width="20"
        height="20"
        loading="lazy"
      />
    ) : null;

  return (
    <a
      href={atUriToUrl(atURI)}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-accent-contrast hover:underline cursor-pointer ${isPublication ? "font-bold" : ""} ${isDocument ? "italic" : ""} ${className}`}
    >
      {icon}
      {children}
    </a>
  );
}
