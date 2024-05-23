import { useState } from "react";
import { CardSmall, ImageSmall, LinkSmall } from "../../components/Icons";

export const TextBlock = (props: { defaultValue: string; lines: number }) => {
  let [value, setValue] = useState(props.defaultValue);
  let [focus, setFocus] = useState(false);

  return (
    <div className="textBlockWrapper relative group pt-3">
      <textarea
        className={`textBlock w-full p-0 border-none outline-none resize-none align-top`}
        style={{
          height: `${props.lines * 24}px`,
        }}
        defaultValue={props.defaultValue}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      />
      <div className="blockTypeSelectorWrapper absolute bottom-0 right-0">
        <BlockTypeSelector focus={focus} empty={value === ""} />
      </div>
    </div>
    //add button to select block type when empty
  );
};

const BlockTypeSelector = (props: { focus: boolean; empty: boolean }) => {
  return (
    <div
      className={`blockTypeSelector
        ${props.focus && props.empty ? "block" : "hidden"}
        ${props.empty && "group-hover:block"}`}
    >
      <div className="flex gap-1 ">
        <button className="opacity-30 hover:opacity-100 hover:text-accent">
          <ImageSmall />
        </button>

        <button className="opacity-30 hover:opacity-100 hover:text-accent">
          <CardSmall />
        </button>

        <button className="opacity-30 hover:opacity-100 hover:text-accent">
          <LinkSmall />
        </button>
      </div>
    </div>
  );
};
export const ImageBlock = (props: { children: React.ReactNode }) => {
  return (
    <div className=" pt-6 relative">
      <div className="absolute right-2 top-2 h-6 w-6 rounded-full bg-bg-card flex place-items-center justify-center">
        x
      </div>
      {props.children}
    </div>
    // add close button
    // add drag handle
    // add rotate
  );
};

export const CardBlock = (props: { children: React.ReactNode }) => {
  return <div>{props.children}</div>;
};

export const ExternalLinkBlock = (props: { children: React.ReactNode }) => {
  return <div>{props.children}</div>;
};
