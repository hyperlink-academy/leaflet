import { Fragment } from "react";
import type { ReplyTarget } from "src/documentReplies";

// Shown on a post that another post's author accepted as a reply.
export function ReplyingTo({ targets }: { targets: ReplyTarget[] }) {
  if (targets.length === 0) return null;
  return (
    <div className="replyingTo pt-3">
      <div className="rounded-md bg-[var(--accent-light)] px-3 py-2 text-secondary">
        This post is a reply to{" "}
        {targets.map((target, i) => (
          <Fragment key={target.uri}>
            {i > 0 && (i === targets.length - 1 ? " and " : ", ")}
            <a
              href={target.href}
              className="font-bold text-accent-contrast hover:underline"
            >
              {target.title}
            </a>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
