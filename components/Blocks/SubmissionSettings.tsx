"use client";
import type { QuestionsAudience } from "src/questionsAudience";
import { AudienceOptions } from "./AudienceOptions";
import {
  CloseSubmissionsOption,
  ClosesAtPage,
  usePopoverHeight,
} from "./CloseSubmissionsOption";

// The settings popover of a questions or reply block: who can submit, when
// submissions close, then the block's own options in `children`.
export function SubmissionSettings(props: {
  entityID: string;
  block: "questions" | "reply";
  audience: QuestionsAudience;
  inPublication: boolean;
  children: React.ReactNode;
}) {
  let page = usePopoverHeight();
  let submissions =
    props.block === "questions" ? ("questions" as const) : ("replies" as const);
  let closesAtAttribute = `${props.block}/closes-at` as const;
  return (
    <div ref={page.ref} style={page.style} className="flex flex-col gap-3">
      {page.onSubpage ? (
        <ClosesAtPage
          entityID={props.entityID}
          attribute={closesAtAttribute}
          onBack={page.back}
        />
      ) : (
        <>
          <AudienceOptions
            entityID={props.entityID}
            block={props.block}
            value={props.audience}
            label={`Who can submit ${submissions}`}
            inPublication={props.inPublication}
          />
          <hr className="border-border-light my-1" />
          <CloseSubmissionsOption
            entityID={props.entityID}
            attribute={closesAtAttribute}
            submissions={submissions}
            onPickDate={page.open}
          />
          <hr className="border-border-light my-1" />
          {props.children}
        </>
      )}
    </div>
  );
}
