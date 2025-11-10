import { Avatar } from "components/Avatar";
import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/BaseTextBlock";
import { ReplyTiny } from "components/Icons/ReplyTiny";
import {
  CommentInNotification,
  ContentLayout,
  Notification,
} from "./Notification";

export const DummyReplyNotification = () => {
  return (
    <Notification
      icon={<ReplyTiny />}
      actionText={<>jared replied to your comment</>}
      content={
        <ContentLayout
          postTitle="This is the Post Title"
          publication={{ name: "My Publication" } as any}
        >
          <CommentInNotification
            className="text-tertiary italic line-clamp-1!"
            avatar={undefined}
            displayName="celine"
            index={[]}
            plaintext={
              "This the original comment. To make a point I'm gonna make the comment really pretty long so you can see for youself how it truncates"
            }
            facets={[]}
          />
          <div className="h-3 -mt-[1px] ml-[10px] border-l border-border" />
          <CommentInNotification
            className=""
            avatar={undefined}
            displayName="celine"
            index={[]}
            plaintext={
              "This is a thoughful and very respectful reply. Violating the code of conduct for me is literally like water for the wicked witch of the west. EeEeEEeeK IT BURNSssSs!!!"
            }
            facets={[]}
          />
        </ContentLayout>
      }
    />
  );
};
