import {
  withdrawReply,
  withdrawReplyDraft,
  type ReplyError,
} from "actions/replies";
import { useActionToast } from "components/useActionToast";
import { useToaster } from "components/Toast";

const withdrawErrorMessages: Partial<Record<ReplyError["type"], string>> = {
  not_owner: "Only the author of the reply can withdraw it.",
};

export function useWithdrawReply() {
  let run = useActionToast<ReplyError>(withdrawErrorMessages);
  let toaster = useToaster();
  let succeeded = (ok: unknown, content: string) => {
    if (ok) toaster({ content, type: "success" });
    return !!ok;
  };
  return {
    withdrawReply: async (replyUri: string) =>
      succeeded(await run(() => withdrawReply(replyUri)), "Reply withdrawn!"),
    withdrawReplyDraft: async (leaflet: string) =>
      succeeded(
        await run(() => withdrawReplyDraft(leaflet)),
        "This draft is no longer a reply.",
      ),
  };
}
