"use client";

import { ButtonPrimary } from "components/Buttons";
import { PaintSmall } from "components/Icons";
import { Popover } from "components/Popover";
import { useState } from "react";
import { borderStyles } from "./borderStyles";

export const MessageComposer = () => {
  let [username, setUsername] = useState("");
  let [mesage, setMessage] = useState("");
  let [borderStyle, setBorderStyle] =
    useState<keyof typeof borderStyles>("default");

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
        className={`w-full text-sm p-4 pb-3 outline-none bg-transparent`}
        style={borderStyles[borderStyle]}
      />
      <div className="flex gap-3 place-self-end items-center">
        <MessageThemeSetter setBorderStyle={setBorderStyle} />
        <ButtonPrimary>send</ButtonPrimary>
      </div>
      <hr className="border-border-light w-full mt-2 mb-4" />
    </div>
  );
};

const MessageThemeSetter = (props: {
  setBorderStyle: (borderStyle: keyof typeof borderStyles) => void;
}) => {
  return (
    <Popover
      trigger={<PaintSmall className="shrink-0 hover:text-accent-contrast" />}
    >
      <div className="flex flex-col gap-2 py-1">
        <div className="flex justify-between w-full items-center text-secondary font-bold">
          Color
          <div className="w-6 h-6 rounded-full border-2 border-white shadow-[0_0_0_1px_#8C8C8C] bg-test" />
        </div>
        <hr className="-mx-1 border-border-light" />
        <div className="text-secondary font-bold ">Border</div>
        <div className="grid grid-cols-4 gap-4">
          <BorderButton
            borderStyle="default"
            setBorderStyle={props.setBorderStyle}
          />

          <BorderButton
            borderStyle="double"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="shadow"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="wavy"
            className="p-0.5"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="sparkle"
            className="p-2"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="animal"
            className="pt-5 pb-2 pl-3 pr-0"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="sprouts"
            className="pt-3 pl-1"
            setBorderStyle={props.setBorderStyle}
          />
          <BorderButton
            borderStyle="lilGuys"
            className="pb-1"
            setBorderStyle={props.setBorderStyle}
          />
        </div>
      </div>
    </Popover>
  );
};

const BorderButton = (props: {
  borderStyle: keyof typeof borderStyles;
  setBorderStyle: (borderStyle: keyof typeof borderStyles) => void;
  className?: string;
}) => {
  return (
    <button
      className={`w-8 h-8 rounded-md ${props.className}`}
      onClick={() => {
        props.setBorderStyle(props.borderStyle);
      }}
    >
      <div className="h-full w-full " style={borderStyles[props.borderStyle]} />
    </button>
  );
};
