"use client";

import { LoginModal } from "components/LoginButton";
import { useIdentityData } from "components/IdentityProvider";

// Mirrors the prompt in the comments drawer on published posts: logged-out
// users are asked to log in; logged-in users without an atproto account are
// asked to link one (LoginModal shows the link flow in that case).
export function EditorCommentLoginPrompt(props: {
  action?: "comment" | "reply";
  onCancel?: () => void;
}) {
  let { identity } = useIdentityData();
  if (identity?.atp_did) return null;
  let action = props.action ?? "comment";
  return (
    <div className="editorCommentLoginPrompt flex flex-col gap-1 text-sm text-tertiary text-center italic p-1">
      <div>
        <span className="text-accent-contrast font-bold not-italic">
          <LoginModal noEmailLogin trigger={identity ? "Link" : "Log in"} />
        </span>{" "}
        {identity ? "" : "with "}an Atmosphere account to {action}
      </div>
      {props.onCancel && (
        <button
          className="text-xs text-tertiary hover:text-accent-contrast"
          onClick={props.onCancel}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
