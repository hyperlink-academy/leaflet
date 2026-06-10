import { AtUri } from "@atproto/api";
import { PubIcon } from "components/ActionBar/Publications";
import { SubscribeInput } from "components/Subscribe/SubscribeButton";
import type { NormalizedPublication } from "src/utils/normalizeRecords";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

// The page-level PublicationThemeProvider already sets every theme CSS variable
// (--bg-leaflet, --bg-page, --primary, --accent-*, fonts) on the whole subtree,
// so the card just consumes them via Tailwind classes. It uses the page-background
// surface (--bg-page) so it stands out from the leaflet background behind it.
export const SubscribeCard = (props: {
  record: NormalizedPublication;
  uri: string;
  newsletterMode: boolean;
}) => {
  let record = props.record;
  let iconUrl = record.icon
    ? blobRefToSrc(record.icon.ref, new AtUri(props.uri).host)
    : undefined;
  return (
    <div
      className="flex flex-col w-full max-w-sm text-primary
        bg-[rgba(var(--bg-page),var(--bg-page-alpha))]
        border border-border-light rounded-lg shadow-md
        p-6"
    >
      <div className="flex flex-row gap-3 items-center pb-3">
        <PubIcon icon={iconUrl} pubName={record.name} large />
        <h3 className="grow min-w-0 text-primary">{record.name}</h3>
      </div>
      {record.description && (
        <p className="text-secondary text-sm pb-4">{record.description}</p>
      )}
      <SubscribeInput
        publicationUri={props.uri}
        publicationUrl={record.url}
        publicationName={record.name}
        publicationDescription={record.description}
        newsletterMode={props.newsletterMode}
      />
    </div>
  );
};
