import { useState } from "react";
import {
  CardSmall,
  CloseTiny,
  ImageSmall,
  LinkSmall,
} from "../../components/Icons";
import { theme } from "../../tailwind.config";
import useMeasure from "react-use-measure";

export const TextBlock = (props: { defaultValue: string; lines: number }) => {
  let [value, setValue] = useState(props.defaultValue);
  let [focus, setFocus] = useState(false);

  return (
    <div className="textBlockWrapper relative group/text pt-3">
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
        ${props.empty && "group-hover/text:block"}`}
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
export const ImageBlock = (props: { src: string; cardHeight: number }) => {
  return (
    <div className="pt-4 pb-2 relative group/image flex w-fit place-self-center justify-center">
      <div className="absolute right-2 top-6 z-10 hidden group-hover/image:block">
        <ImageRemoveButton />
      </div>
      <img
        src={props.src}
        alt="image"
        className={`w-max relative`}
        style={{ maxHeight: `calc(${props.cardHeight}px - 48px)` }}
      />
    </div>
  );
};

const ImageRemoveButton = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.5314 17.2686C20.1562 17.8935 20.1562 18.9065 19.5314 19.5314C18.9065 20.1562 17.8935 20.1562 17.2686 19.5314L12 14.2627L6.73137 19.5314C6.10653 20.1562 5.09347 20.1562 4.46863 19.5314C3.84379 18.9065 3.84379 17.8935 4.46863 17.2686L9.73726 12L4.46863 6.73137C3.84379 6.10653 3.84379 5.09347 4.46863 4.46863C5.09347 3.84379 6.10653 3.84379 6.73137 4.46863L12 9.73726L17.2686 4.46863C17.8935 3.84379 18.9065 3.84379 19.5314 4.46863C20.1562 5.09347 20.1562 6.10653 19.5314 6.73137L14.2627 12L19.5314 17.2686Z"
        fill={theme.colors.primary}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.2686 4.46863C17.8935 3.84379 18.9065 3.84379 19.5314 4.46863C20.1562 5.09347 20.1562 6.10653 19.5314 6.73137L14.2627 12L19.5314 17.2686C20.1562 17.8935 20.1562 18.9065 19.5314 19.5314C18.9065 20.1562 17.8935 20.1562 17.2686 19.5314L12 14.2627L6.73137 19.5314C6.10653 20.1562 5.09347 20.1562 4.46863 19.5314C3.84379 18.9065 3.84379 17.8935 4.46863 17.2686L9.73726 12L4.46863 6.73137C3.84379 6.10653 3.84379 5.09347 4.46863 4.46863C5.09347 3.84379 6.10653 3.84379 6.73137 4.46863L12 9.73726L17.2686 4.46863ZM12 7.61594L16.208 3.40797C17.4186 2.19734 19.3814 2.19734 20.592 3.40797C21.8027 4.61859 21.8027 6.58141 20.592 7.79203L16.3841 12L20.592 16.208C21.8027 17.4186 21.8027 19.3814 20.592 20.592C19.3814 21.8027 17.4186 21.8027 16.208 20.592L12 16.3841L7.79203 20.592C6.58141 21.8027 4.61859 21.8027 3.40797 20.592C2.19734 19.3814 2.19734 17.4186 3.40797 16.208L7.61594 12L3.40797 7.79203C2.19734 6.5814 2.19734 4.6186 3.40797 3.40797C4.61859 2.19734 6.58141 2.19734 7.79203 3.40797L12 7.61594Z"
        fill={theme.colors["bg-card"]}
      />
    </svg>
  );
};

export const CardBlock = (props: {
  children: React.ReactNode;
  fontSize: string;
  imgSrc?: string;
  cardHeight?: number;
}) => {
  let [blockRef, { width: blockWidth }] = useMeasure();

  return (
    <div
      ref={blockRef}
      className="cardBlockWrapper w-full mt-3 border bg-bg-card border-border hover:border-accent outline outline-1 outline-transparent hover:outline-accent rounded-lg flex flex-col overflow-hidden"
      style={{ maxHeight: blockWidth }}
    >
      {props.imgSrc && (
        <div className="w-full h-fit max-h-full flex overflow-hidden">
          <img
            src={props.imgSrc}
            className={`w-max relative place-self-center`}
          />
        </div>
      )}

      <div className="flex items-center p-2">
        <div
          className={`w-full grow ${
            props.fontSize === "h1"
              ? "text-lg font-bold line-clamp-1"
              : props.fontSize === "h2"
                ? "text-base font-bold line-clamp-1"
                : props.fontSize === "h3"
                  ? "text-sm font-bold italic line-clamp-2"
                  : props.fontSize === "p"
                    ? "text-sm line-clamp-2"
                    : ""
          }`}
        >
          {props.children}
        </div>

        <div className="shrink-0 opacity-30 hover:text-accent hover:opacity-100">
          <CloseTiny />
        </div>
      </div>
    </div>
  );
};

export const ExternalLinkBlock = (props: { children: React.ReactNode }) => {
  return <div>{props.children}</div>;
};
