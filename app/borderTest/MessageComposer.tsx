"use client";

import { ButtonPrimary } from "components/Buttons";
import { PaintSmall } from "components/Icons";
import { useState } from "react";

export const MessageComposer = () => {
  let [username, setUsername] = useState("");
  let [mesage, setMessage] = useState("");

  return (
    <div className="flex flex-col gap-2 items-start relative">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.currentTarget.value)}
        placeholder="Name (optional)"
        className=" absolute -top-3 left-2 w-fit text-sm px-2 py-0.5 border border-border rounded-full outline-none font-bold  "
      />
      <textarea
        rows={4}
        onChange={(e) => setMessage(e.currentTarget.value)}
        placeholder="write something..."
        className="w-full text-sm p-4 pb-3 bg-transparent outline-none border border-border rounded-md"
      />
      <div className="flex gap-3 place-self-end items-center">
        <PaintSmall className="shrink-0" />
        <ButtonPrimary>send</ButtonPrimary>
      </div>
      <hr className="border-border-light w-full mt-2 mb-4" />
    </div>
  );
};
