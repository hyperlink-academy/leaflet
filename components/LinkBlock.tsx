import { useState } from "react";
import { CloseContrastSmall, CloseTiny } from "./Icons";
import { theme } from "tailwind.config";

type linkType = {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: {
    url: string;
    width: number;
    height: number;
  } | null;
  logo?: {
    url: string;
    width?: number;
    height?: number;
  } | null;
  author?: string | null;
};

export const ExternalLinkBlock = () => {
  let [title, setTitle] = useState("Title");
  let [description, setDescription] = useState(
    "hello, this is a little description. I want it to be a little bit long so that I can see if it wrapping around but it thought it was long enought and it wasn't actually so im adding a little more on",
  );
  let [link, setLink] = useState<linkType>({
    url: "www.hello.com",
    title: "Title",
    description: "hi I'm a description",
    image: {
      url: "/",
      width: 64,
      height: 64,
    },
    logo: {
      url: "/",
      width: 64,
      height: 64,
    },
    author: "me",
  });

  return (
    <a
      href={link.url}
      target="_blank"
      className="externalLinkBlock relative group h-[104px]  mb-3  flex  border border-border hover:border-accent outline outline-1 outline-transparent hover:outline-accent rounded-lg overflow-hidden"
    >
      <div className="flex flex-col grow pt-2 pb-2 px-2 min-w-0 h-full">
        <button
          onClick={(e) => {
            e.preventDefault();
          }}
          className="absolute top-0.5 right-0.5 group-hover:block hidden text-accent"
        >
          <CloseContrastSmall
            fill={theme.colors.accentText}
            stroke={theme.colors.accent}
          />
        </button>
        <div className="flex flex-col w-full min-w-0 grow ">
          <div
            className={`linkBlockTitle bg-transparent -mb-0.5  border-none text-base font-bold outline-none resize-none align-top border  line-clamp-1`}
          >
            {link.title}
          </div>
          <div
            className={`linkBlockDescription text-sm bg-transparent border-none outline-none resize-none align-top  grow line-clamp-2`}
          >
            {link.description}
          </div>
        </div>
        <div className="inline-block place-self-end w-full text-xs text-tertiary italic line-clamp-3 shrink-0 truncate group-hover:text-accent">
          {link.url}
        </div>
      </div>

      <div
        className={`linkBlockPreview w-[120px] m-2 -mb-2 bg-test shrink-0 rounded-t-md border border-border group-hover:border-accent`}
      />
    </a>
  );
};
