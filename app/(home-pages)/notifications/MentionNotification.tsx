import { MentionTiny } from "components/Icons/MentionTiny";
import { ContentLayout, Notification } from "./Notification";

export const DummyPostMentionNotification = (props: {}) => {
  return (
    <Notification
      timestamp={""}
      href="/"
      icon={<MentionTiny />}
      actionText={<>celine mentioned your post</>}
      content={
        <ContentLayout
          postTitle={"Post Title Here"}
          pubRecord={{ name: "My Publication" } as any}
        >
          I'm just gonna put the description here. The surrounding context is
          just sort of a pain to figure out
          <div className="border border-border-light rounded-md p-1 my-1 text-xs text-secondary">
            <div className="font-bold">Title of the Mentioned Post</div>
            <div className="text-tertiary">
              And here is the description that follows it
            </div>
          </div>
        </ContentLayout>
      }
    />
  );
};

export const DummyUserMentionNotification = (props: {
  cardBorderHidden: boolean;
}) => {
  return (
    <Notification
      timestamp={""}
      href="/"
      icon={<MentionTiny />}
      actionText={<>celine mentioned you</>}
      content={
        <ContentLayout
          postTitle={"Post Title Here"}
          pubRecord={{ name: "My Publication" } as any}
        >
          <div>
            ...llo this is the content of a post or whatever here it comes{" "}
            <span className="text-accent-contrast">@celine </span> and here it
            was! ooooh heck yeah the high is unre...
          </div>
        </ContentLayout>
      }
    />
  );
};
