"use client";
import useSWR from "swr";
import { getCanAskQuestion } from "actions/questions";
import { useIdentityData } from "components/IdentityProvider";
import { useViewerSubscription } from "components/Subscribe/viewerSubscription";
import {
  audienceGatePolicy,
  type QuestionsAudience,
} from "src/questionsAudience";
import { membershipUnlocksGatedPost } from "src/membership";
import { isDocumentOwner } from "src/utils/isDocumentOwner";

// Whether the viewer is in a questions or reply block's audience: undefined
// while that's still being looked up. `author` names the post's author for a
// follow-based audience the viewer isn't in.
export function useCanSubmit(props: {
  documentUri: string;
  audience: QuestionsAudience;
  tierIds?: string[];
  publicationUri?: string;
  skip?: boolean;
}) {
  let { identity } = useIdentityData();
  let viewer = identity?.atp_did ?? null;
  let { membership } = useViewerSubscription(props.publicationUri);
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
  let policy = audienceGatePolicy(props.audience, props.tierIds ?? []);
  let canSubmit =
    props.audience === "anyone"
      ? true
      : policy
        ? membershipUnlocksGatedPost(membership, policy)
        : error
          ? true
          : data?.canAsk;
  return { canSubmit, author: data?.author ?? null };
}
