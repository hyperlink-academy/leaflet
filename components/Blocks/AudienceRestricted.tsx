"use client";
import { Modal } from "components/Modal";
import { SubscribePanel } from "components/Subscribe/SubscribeButton";
import type { InteractionAuthor } from "src/interactionAuthor";
import type { QuestionsAudience } from "src/questionsAudience";
import type { SubscriptionPlacement } from "src/subscriptionSource";
import type { QuestionsPublication } from "./QuestionsBlock/QuestionsView";
import { authorDisplayName } from "./InteractionAuthorName";
import { ProfilePopover } from "components/ProfilePopover";

export function AudienceRestricted(props: {
  audience: Exclude<QuestionsAudience, "anyone">;
  author: InteractionAuthor | null;
  publication?: QuestionsPublication;
  // e.g. "a question"
  submission: string;
  placement: SubscriptionPlacement;
  className?: string;
}) {
  return (
    <div className={`text-sm italic text-tertiary ${props.className ?? ""}`}>
      {props.audience === "subscribers" ? (
        <>
          Subscribers can submit {props.submission}.{" "}
          {props.publication && (
            <Modal
              asChild
              trigger={
                <button className="text-accent-contrast font-bold italic">
                  Subscribe?
                </button>
              }
            >
              <div className="w-md max-w-full">
                <SubscribePanel
                  {...props.publication}
                  source={{ placement: props.placement }}
                />
              </div>
            </Modal>
          )}
        </>
      ) : props.audience === "follows" ? (
        <div>People the author follows can submit {props.submission}.</div>
      ) : (
        <div>
          People who{" "}
          {props.author ? (
            <ProfilePopover
              trigger={<span className="underline">follow the author</span>}
              didOrHandle={props.author?.did}
            />
          ) : (
            "follow the author"
          )}{" "}
          on Bluesky can submit {props.submission}.
        </div>
      )}
    </div>
  );
}
