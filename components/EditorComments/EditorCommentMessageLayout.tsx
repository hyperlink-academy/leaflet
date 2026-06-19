"use client";

import { Avatar } from "components/Avatar";
import { useRecordFromDid } from "src/utils/useRecordFromDid";

// The full shape of a comment message — an avatar + author name header row
// and the content below it — shared by rendered messages and the composer,
// so a comment keeps the same layout whether it's being read, drafted, or
// edited in place.
export function EditorCommentMessageLayout(props: {
  did?: string | null;
  // date / action buttons at the end of the header row
  headerActions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  let { data: profile } = useRecordFromDid(props.did ?? undefined);
  return (
    <div
      className={`editor-comment-message flex flex-col gap-0.5 ${props.className ?? ""}`}
    >
      <div className="flex gap-1 items-center min-w-0">
        <Avatar
          src={profile?.avatar}
          displayName={profile?.displayName || profile?.handle}
          size="tiny"
        />
        <div className="font-bold text-sm text-secondary truncate min-w-0 ">
          {profile?.displayName || profile?.handle || "..."}
        </div>

        {props.headerActions}
      </div>
      <div
        className="editor-comment-message-content relative text-sm text-primary pl-5"
        style={{ wordBreak: "break-word" }}
      >
        {props.children}
      </div>
    </div>
  );
}
