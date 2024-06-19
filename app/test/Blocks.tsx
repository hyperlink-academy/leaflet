import { useState } from "react";
import {
  BlockCardSmall,
  CloseConstrastSmall,
  CloseTiny,
  BlockImageSmall,
  LinkSmall,
} from "../../components/Icons";
import { theme } from "../../tailwind.config";
import useMeasure from "react-use-measure";

export const TextBlock = (props: { defaultValue: string; lines: number }) => {
  let [value, setValue] = useState(props.defaultValue);
  let [focus, setFocus] = useState(false);

  return (
    <div className="textBlockWrapper relative group/text pb-3">
      <textarea
        className={`textBlock w-full p-0 border-none outline-none resize-none align-top bg-transparent`}
        style={{
          height: `${props.lines * 24}px`,
        }}
        defaultValue={props.defaultValue}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      />
      <div className="blockTypeSelectorWrapper absolute top-0 right-0">
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
        <button className="text-tertiary hover:text-accent">
          <BlockImageSmall />
        </button>

        <button className="text-tertiary hover:text-accent">
          <BlockCardSmall />
        </button>

        <button className="text-tertiary hover:text-accent">
          <LinkSmall />
        </button>
      </div>
    </div>
  );
};
export const ImageBlock = (props: { src: string; cardHeight: number }) => {
  return (
    <div className="pb-4 pt-2 relative group/image flex w-fit place-self-center justify-center">
      <button className="absolute right-2 top-6 z-10 hidden group-hover/image:block">
        <CloseConstrastSmall
          fill={theme.colors.primary}
          outline={theme.colors["bg-card"]}
        />{" "}
      </button>
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
  title?: string;
  body?: string;
  screenshot?: string;
  cardHeight?: number;
}) => {
  let [blockRef, { width: blockWidth }] = useMeasure();

  return (
    <div
      ref={blockRef}
      className="cardBlockWrapper relative group w-full h-[104px] mb-3 border  border-border outline outline-1 outline-transparent hover:outline-border rounded-lg flex overflow-hidden"
    >
      {/*
        all headers are reduced to h3 styling to keep the card block consistent and legible
        the card block will render as much text as can fit in the block without overflowing
        if the text overflows, it will be truncated and an ellipsis will be added to the end of the text

        what happens in there is no text content at all?
        what happens if the title spans two lines, how much space is left for the body?

        I think the logic i used is flawed and won't stand up to reality so let's figure this out in earnest later
        */}

      {/* TODO: implement long press to select and bring up options (such as remove)*/}
      <div className="absolute top-0.5 right-0.5 group-hover:block hidden text-border hover:text-accent ">
        <CloseTiny />
      </div>

      <div className="cardBlockContent grow p-2">
        {props.title && (
          <div className={`w-full grow text-base font-bold line-clamp-3`}>
            {props.title}
          </div>
        )}
        {props.body && (
          <div
            className={`w-full grow text-sm ${!props.title ? "line-clamp-4" : "line-clamp-3"}`}
          >
            {props.body}
          </div>
        )}
      </div>

      <div
        className={`cardBlockPreview w-[120px] m-2 -mb-2 bg-cover shrink-0 rounded-t-md border border-border-light `}
        style={{ backgroundImage: `url(${props.screenshot})` }}
      />
    </div>
  );
};

export const ExternalLinkBlock = () => {
  let [title, setTitle] = useState("Title");
  let [description, setDescription] = useState(
    "hello, this is a little description. I want it to be a little bit long so that I can see if it wrapping around but it thought it was long enought and it wasn't actually so im adding a little more on",
  );

  return (
    <a
      href="www.google.com"
      className="externalLinkBlock relative group h-[104px]  mb-3  flex  border border-border hover:border-accent outline outline-1 outline-transparent hover:outline-accent rounded-lg overflow-hidden"
    >
      <div className="absolute top-0.5 right-0.5 group-hover:block hidden text-accent">
        <CloseTiny />
      </div>
      <div className="pt-2 pb-2 px-2 grow min-w-0">
        <div className="flex flex-col w-full min-w-0 h-full grow ">
          <textarea
            // when this textarea is replaced a responsive one,
            // make it such that the text area is only as wide as it's contents
            // such that click anything but the literaly words of the title and description will nav you to the link
            // and clicking the title or description will allow you to edit them
            className={`linkBlockTitle bg-transparent -mb-0.5  border-none text-base font-bold outline-none resize-none align-top border h-[24px] line-clamp-1`}
            defaultValue={title}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />

          <textarea
            className={`linkBlockDescription text-sm bg-transparent border-none outline-none resize-none align-top  grow line-clamp-2`}
            defaultValue={description}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
          <div className="inline-block place-self-end w-full text-xs text-tertiary italic line-clamp-1 truncate group-hover:text-accent">
            https://www.flickr.com/photos/biodivlibrary/https://www.flickr.com/photos/biodivlibrary/https://www.flickr.com/photos/biodivlibrary/
          </div>
        </div>
      </div>

      <div
        className={`linkBlockPreview w-[120px] m-2 -mb-2 bg-cover shrink-0 rounded-t-md border border-border group-hover:border-accent`}
        style={{ backgroundImage: `url(./test-link.png)` }}
      />
    </a>
  );
};
