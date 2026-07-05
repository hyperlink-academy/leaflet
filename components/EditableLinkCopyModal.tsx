"use client";
import { Modal } from "components/Modal";
import { Checkbox } from "components/Checkbox";
import { ButtonPrimary } from "components/Buttons";
import { useSmoker } from "components/Toast";
import { useLocalStorageState } from "src/hooks/useLocalStorageState";

const storageKey = "skipEditableLinkCopyModal";

// When the flag is set, copying an edit link for a publication draft skips
// the "this link is editable" explainer and copies immediately. Read straight
// from localStorage so a flag set in one modal instance applies to the next
// click without waiting for a remount.
export function shouldSkipEditableLinkCopyModal() {
  try {
    return window.localStorage.getItem(storageKey) === "true";
  } catch {
    return false;
  }
}

function useSkipEditableLinkCopyModal() {
  return useLocalStorageState(storageKey, false);
}

export const EditableLinkCopyModal = (props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // path relative to the site root, without a leading slash
  link: string | null;
}) => {
  let smoker = useSmoker();
  let [skipModal, setSkipModal] = useSkipEditableLinkCopyModal();

  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Copy Edit Link"
      className="max-w-sm"
    >
      <div className="flex flex-col gap-3">
        <div className="text-secondary">
          You're copying an <strong>editable</strong> share link. Anyone with
          this link can edit this draft, so only share it with people you want
          working on it with you!
        </div>
        <ButtonPrimary
          id="copy-editable-link-button"
          className="mx-auto"
          onClick={() => {
            if (!props.link) return;
            navigator.clipboard.writeText(
              `${location.protocol}//${location.host}/${props.link}`,
            );
            let rect = document
              .getElementById("copy-editable-link-button")
              ?.getBoundingClientRect();
            smoker({
              position: {
                x: rect ? rect.left + (rect.right - rect.left) / 2 : 0,
                y: rect ? rect.top + 26 : 0,
              },
              text: "Edit link copied!",
            });
            props.onOpenChange(false);
          }}
        >
          Copy Edit Link
        </ButtonPrimary>
        <Checkbox
          small
          checked={skipModal}
          onChange={(e) => setSkipModal(e.target.checked)}
        >
          Don't show this again
        </Checkbox>
      </div>
    </Modal>
  );
};
