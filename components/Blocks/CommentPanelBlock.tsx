import { CloseTiny, CommentDefaultTiny } from "components/Icons";
import { useUIState } from "src/useUIState";

export const CommentPanelBlock = (props: {
  entityID: string;
  parent: string;
}) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  return (
    <div className="w-full text-tertiary text-sm flex flex-col gap-1">
      {/* <hr
        className={`${isSelected ? "border-border" : "border-border-light"}`}
      /> */}
      <button
        className="flex gap-1 items-center w-fit px-1 place-self-end hover:bg-border-light rounded-md"
        onClick={() => {
          useUIState.setState({ openCommentSection: props.entityID });
        }}
      >
        6 <CommentDefaultTiny />
      </button>
    </div>
  );
};

export const CommentPanel = (props: {}) => {
  return (
    <div
      className="commentSection relative  w-[var(--page-width-units)] sm:w-[calc(var(--page-width-units)/2)]  -ml-2 pl-6 p-4 rounded-r-lg text-sm text-secondary flex flex-col justify-between"
      style={{
        backgroundColor:
          "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
      }}
    >
      <button
        className="absolute top-4 right-4 p-0.5"
        onClick={() => {
          useUIState.setState({ openCommentSection: null });
        }}
      >
        <CloseTiny />
        {/* needs MORE OPTIONS for changing permissions */}
      </button>
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

// i need to set which (if any) comment section is open in the UI state, and then use that to render the drawer
