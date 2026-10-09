import { AtUri } from "@atproto/syntax";
import { PubIcon } from "components/ActionBar/Publications";
import { LooseLeafSmall } from "components/Icons/LooseleafSmall";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import type { NormalizedPublication } from "src/utils/normalizeRecords";

export const PublishingTo = (props: {
  publication_uri?: string;
  record?: NormalizedPublication | null;
  label?: string;
}) => {
  if (props.publication_uri && props.record) {
    return (
      <div className="flex  justify-between gap-4">
        <div className="text-tertiary">{props.label ?? "Publishing to"}</div>
        <div className="flex gap-2 items-center ">
          <div className="font-bold text-secondary">{props.record.name}</div>
          <PubIcon
            icon={
              props.record.icon
                ? blobRefToSrc(
                    props.record.icon.ref,
                    new AtUri(props.publication_uri).host,
                  )
                : undefined
            }
            pubName={props.record.name}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <h3>Publishing as</h3>
      <div className="flex gap-2 items-center p-2 rounded-md bg-[var(--accent-light)]">
        <LooseLeafSmall className="shrink-0" />
        <div className="font-bold text-secondary">Looseleaf</div>
      </div>
    </div>
  );
};
