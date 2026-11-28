import { AtUri } from "@atproto/api";
import { PubIcon } from "components/ActionBar/Publications";
import { SubscribeInput } from "components/Subscribe/SubscribeButton";
import type { NormalizedPublication } from "src/utils/normalizeRecords";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import type { CtaText } from "src/publicationDefaults";
import { CtaDescription } from "components/Subscribe/CtaDescription";

export const SubscribeCard = (props: {
  record: NormalizedPublication;
  uri: string;
  newsletterMode: boolean;
  cta?: CtaText;
}) => {
  let record = props.record;
  let header = props.cta?.header || record.name;
  let description = props.cta?.description || record.description;
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
        <h3 className="grow min-w-0 text-primary">{header}</h3>
      </div>
      {description && (
        <CtaDescription
          text={description}
          className="text-secondary text-sm pb-4"
        />
      )}
      <SubscribeInput
        publicationUri={props.uri}
        publicationUrl={record.url}
        source={{ placement: "subscribe_page" }}
        publicationName={record.name}
        publicationDescription={record.description}
        newsletterMode={props.newsletterMode}
      />
    </div>
  );
};
