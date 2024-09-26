import { CloseTiny, DiscussionDefaultTiny } from "components/Icons";
import { useState } from "react";
import { useUIState } from "src/useUIState";
import { v7 } from "uuid";

type Message = {
  id: string;
  sender: string;
  created_at: string;
  contents: string;
};
export const Discussion = (props: { entityID: string }) => {
  let [messages, setMessages] = useState<Message[]>([]);
  return (
    <div className="discussion relative sm:p-4 p-3 w-full h-full text-sm text-secondary flex flex-col justify-between">
      <div>
        {messages.map((m) => (
          <Message key={m.id} {...m} />
        ))}
      </div>
      <MessageComposer
        sendMessage={(m) => setMessages((messages) => [...messages, m])}
      />
    </div>
  );
};

const Message = (props: Message) => {
  return (
    <div className="flex flex-col">
      <div className="text-tertiary font-bold">{props.sender}</div>
      <div>{props.contents}</div>
    </div>
  );
};

const MessageComposer = (props: { sendMessage: (m: Message) => void }) => {
  let [username, setUsername] = useState("");
  let [message, setMessage] = useState("");
  return (
    <div className="flex flex-col -mx-1 items-center">
      <hr className="border-tertiary w-full mb-2" />
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.currentTarget.value)}
        placeholder="Name (optional)"
        className="w-full text-sm p-1 border border-tertiary rounded-md bg-transparent outline-none font-bold"
      />
      <textarea
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
        placeholder="write something..."
        className="w-full text-sm p-1 bg-transparent outline-none"
      />
      <button
        className="font-bold bg-accent-1 w-full rounded-md text-accent-2 py-0.5"
        onClick={() => {
          props.sendMessage({
            id: v7(),
            sender: username,
            contents: message,
            created_at: new Date().toISOString(),
          });
          setMessage("");
        }}
      >
        send
      </button>
    </div>
  );
};
