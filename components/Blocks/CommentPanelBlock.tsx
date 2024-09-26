import { CloseTiny, DiscussionDefaultTiny } from "components/Icons";
import { useUIState } from "src/useUIState";

export const Discussion = (props: { entityID: string }) => {
  return (
    <div className="discussion relative sm:p-4 p-3 w-full h-full text-sm text-secondary flex flex-col justify-between">
      {/* <div className="flex flex-col gap-2">
        <Message message="hello" />
        <Message message="how are you" />
        <Message message="I'm good!" />
        <Message message="omg that's great :D" />
      </div> */}
      <CommentPanelEmpty />
      <MessageComposer />
    </div>
  );
};

const CommentPanelEmpty = (props: {}) => {
  return (
    <div>
      <div>Who can comment?</div>
      <div>
        People who can't comment won't see this comments section at all.
      </div>

      <div>anyone</div>
      <div>authors only</div>
      <div>invite only</div>
      <div>send someone this link to invite them to this conversation</div>
    </div>
  );
};

const Message = (props: { message: string }) => {
  return (
    <div className="flex flex-col">
      <div className="text-tertiary font-bold">anon</div>
      <div>{props.message}</div>
    </div>
  );
};

const MessageComposer = (props: {}) => {
  return (
    <div className="flex flex-col -mx-1 items-center">
      <hr className="border-tertiary w-full mb-2" />
      <input
        type="text"
        placeholder="Name (optional)"
        className="w-full text-sm p-1 border border-tertiary rounded-md bg-transparent outline-none font-bold"
      />
      <textarea
        rows={4}
        placeholder="write something..."
        className="w-full text-sm p-1 bg-transparent outline-none"
      />
      <button className="font-bold bg-accent-1 w-full rounded-md text-accent-2 py-0.5">
        send
      </button>
    </div>
  );
};
