"use client";
import { useState } from "react";
import Link from "next/link";
import { AtUri } from "@atproto/syntax";
import { ButtonPrimary } from "components/Buttons";
import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import type { NormalizedPublication } from "src/utils/normalizeRecords";
import type { EmailOnlyIneligibleReason } from "src/emailPosts/eligibility";
import {
  onSubscribeTrigger,
  type EmailPostSummary,
} from "src/emailPosts/types";
import { PublishingTo } from "../publish/PublishingTo";
import { EmailOnlyForm } from "./EmailOnlyForm";

type Props = {
  leaflet_id: string;
  root_entity: string;
  title: string;
  description: string;
  publication_uri: string;
  pubRecord: NormalizedPublication | null;
  subscriberCount: number;
  membershipsEnabled: boolean;
  ineligibleReason: EmailOnlyIneligibleReason | null;
  existing: EmailPostSummary | null;
};

export function SendEmail(props: Props) {
  let [saved, setSaved] = useState<EmailPostSummary | null>(null);
  return (
    <div className="publishPage w-screen min-h-screen bg-bg-page flex justify-center text-primary">
      {saved ? (
        <EmailPostSuccess
          email={saved}
          publication_uri={props.publication_uri}
          record={props.pubRecord}
        />
      ) : (
        <SendEmailForm {...props} onSaved={setSaved} />
      )}
    </div>
  );
}

function SendEmailForm(
  props: Props & { onSaved: (email: EmailPostSummary) => void },
) {
  let [existing, setExisting] = useState(props.existing);
  let { rep } = useReplicache();
  // Title and description come from Replicache, the same source the editor
  // uses, so a title the author just changed is the one that's sent.
  let replicacheTitle = useSubscribe(rep, (tx) =>
    tx.get<string>("publication_title"),
  );
  let replicacheDescription = useSubscribe(rep, (tx) =>
    tx.get<string>("publication_description"),
  );
  let title =
    typeof replicacheTitle === "string" ? replicacheTitle : props.title;
  let description =
    typeof replicacheDescription === "string"
      ? replicacheDescription
      : props.description;

  return (
    <div className="flex flex-col gap-4 w-[640px] max-w-full sm:px-4 px-3 sm:py-8 py-4 text-primary">
      <div className="frosted-container flex flex-col gap-3 sm:p-3 p-4">
        <h2>Send Email</h2>
        <PublishingTo
          label="Sending from"
          publication_uri={props.publication_uri}
          record={props.pubRecord}
        />
        <hr className="border-border-light" />
        <EmailOnlyForm
          leaflet_id={props.leaflet_id}
          root_entity={props.root_entity}
          publication_uri={props.publication_uri}
          title={title}
          description={description}
          subscriberCount={props.subscriberCount}
          membershipsEnabled={props.membershipsEnabled}
          ineligibleReason={props.ineligibleReason}
          existing={existing}
          onSaved={props.onSaved}
          onCanceled={() => setExisting(null)}
        />
      </div>
    </div>
  );
}

const EmailPostSuccess = (props: {
  email: EmailPostSummary;
  publication_uri: string;
  record: NormalizedPublication | null;
}) => {
  let uri = new AtUri(props.publication_uri);
  let { email } = props;
  let sendAt = useLocalizedDate(email.send_at ?? "", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  let [heading, detail] =
    email.send_mode === "on_subscribe"
      ? [
          "Email turned on!",
          `Each reader will get it ${onSubscribeTrigger(email.audience)}.`,
        ]
      : email.send_at && new Date(email.send_at).getTime() > Date.now()
        ? ["Email scheduled!", `It will go out ${sendAt}.`]
        : ["Email on its way!", "It's sending to your subscribers now."];
  return (
    <div className="frosted-container p-4 m-3 sm:m-4 flex flex-col gap-1 justify-center text-center w-fit h-fit mx-auto place-self-center">
      <h2 className="pt-2">{heading}</h2>
      <p className="text-secondary">{detail}</p>
      {props.record && (
        <Link
          className="hover:no-underline! font-bold place-self-center pt-2"
          href={`/lish/${uri.host}/${encodeURIComponent(props.record.name || "")}/dashboard/emails`}
        >
          <ButtonPrimary>See your Emails</ButtonPrimary>
        </Link>
      )}
      <Link href={`/${email.leaflet}`}>Back to the email</Link>
    </div>
  );
};
