import { CommentTiny } from "components/Icons/CommentTiny";
import { ReplyTiny } from "components/Icons/ReplyTiny";

export const Notification = (props: {
  identity: string;
  action: "comment" | "reply" | "follow";
  content: React.ReactNode;
}) => {
  return (
    <div className="flex flex-row gap-2 w-full">
      <div className="text-secondary pt-[6px] shrink-0">
        {props.action === "comment" ? (
          <CommentTiny />
        ) : props.action === "reply" ? (
          <ReplyTiny />
        ) : props.action === "follow" ? (
          "followed you!"
        ) : (
          "did something!"
        )}
      </div>
      <div className="flex flex-col gap-0 w-full grow ">
        <div className="text-base text-secondary font-bold">
          {props.identity}{" "}
          {props.action === "comment"
            ? "commented on your post"
            : props.action === "reply"
              ? "replied to your comment"
              : props.action === "follow"
                ? "followed you!"
                : "did something!"}
        </div>
        {props.content}
      </div>
    </div>
  );
};
