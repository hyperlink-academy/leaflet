import { ButtonPrimary } from "components/Buttons";
import { isOAuthSessionError, OAuthErrorMessage } from "components/OAuthError";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "components/Modal";
import { Checkbox } from "components/Checkbox";
import {
  useNormalizedPublicationRecord,
  usePublicationData,
} from "../PublicationSWRProvider";
import { deletePublication } from "./deletePublication";

export const DeletePublication = () => {
  let [confirmed, setConfirmed] = useState(false);
  let [deleting, setDeleting] = useState(false);
  let record = useNormalizedPublicationRecord();
  let { data: pub } = usePublicationData();
  let postCount = pub?.documents?.length ?? 0;
  let draftCount = pub?.drafts?.length ?? 0;
  let subCount = pub?.publication?.publication_subscriptions?.length ?? 0;
  let toaster = useToaster();
  let router = useRouter();
  let pubUri = pub?.publication?.uri;

  let onDelete = async () => {
    if (!pubUri || !confirmed || deleting) return;
    setDeleting(true);
    let result = await deletePublication(pubUri);
    if (!result.success) {
      setDeleting(false);
      toaster({
        type: "error",
        content: isOAuthSessionError(result.error) ? (
          <OAuthErrorMessage error={result.error} />
        ) : typeof result.error === "string" ? (
          result.error
        ) : (
          "We couldn't delete the publication. Please try again!"
        ),
      });
      return;
    }
    toaster({
      type: "success",
      content: `${record?.name ?? "Publication"} deleted`,
    });
    router.push("/home");
  };

  let pluralize = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`;

  return (
    <Modal
      asChild
      className="text-center"
      trigger={<ButtonPrimary>Delete Publication</ButtonPrimary>}
      title="Are you sure?"
    >
      <div className="text-secondary flex flex-col max-w-prose">
        <div className="pb-3 text-left">
          This will permanently delete:
          <ul className="list-disc pl-5 pt-1">
            <li>This publication and its settings</li>
            <li>
              {pluralize(postCount, "published post")}
              {postCount > 0 ? " (removed from your PDS)" : ""}
            </li>
            <li>{pluralize(draftCount, "draft")}</li>
            <li>All associated records on your PDS</li>
          </ul>
          {subCount > 0 && (
            <div className="pt-2">
              {pluralize(subCount, "subscriber")} will lose access.
            </div>
          )}
          <div className="pt-2 font-bold text-primary">
            This cannot be undone or restored.
          </div>
        </div>
        <div className="accent-container p-4 flex flex-col justify-center">
          <Checkbox
            className="mb-3 mx-auto text-left justify-center!"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.currentTarget.checked)}
          >
            I understand and agree
          </Checkbox>

          <ButtonPrimary
            className="mx-auto mb-1"
            disabled={!confirmed || deleting || !pubUri}
            onClick={onDelete}
          >
            {deleting ? <DotLoader /> : "Delete Publication"}
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
  );
};
