"use client";
import useSWR from "swr";
import { getCanAskQuestion } from "actions/questions";
import { useIdentityData } from "components/IdentityProvider";
import { useViewerSubscription } from "components/Subscribe/viewerSubscription";
import type { QuestionsAudience } from "src/questionsAudience";
import { isDocumentOwner } from "src/utils/isDocumentOwner";

// Whether the viewer is in a questions or reply block's audience: undefined
// while that's still being looked up. `author` names the post's author for a
// follow-based audience the viewer isn't in.
export function useCanSubmit(props: {
  documentUri: string;
  audience: QuestionsAudience;
  publicationUri?: string;
  skip?: boolean;
}) {
  let { identity } = useIdentityData();
  let viewer = identity?.atp_did ?? null;
  let { subscribed } = useViewerSubscription(props.publicationUri);
  let followAudience =
    props.audience === "follows" || props.audience === "followers";
  let { data, error } = useSWR(
    viewer &&
      followAudience &&
      !props.skip &&
      !isDocumentOwner(props.documentUri, viewer)
      ? ["can_ask_question", props.documentUri, viewer, props.audience]
      : null,
    () => getCanAskQuestion(props.documentUri, props.audience),
    { revalidateOnFocus: false, revalidateIfStale: false },
  );
  let canSubmit =
    props.audience === "anyone"
      ? true
      : props.audience === "subscribers"
        ? subscribed
        : // The submit action checks again, so a failed lookup lets them try.
          error
          ? true
          : data?.canAsk;
  return { canSubmit, author: data?.author ?? null };
}
