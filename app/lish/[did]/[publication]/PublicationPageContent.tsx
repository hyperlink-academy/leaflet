import React from "react";
import { SpeedyLink } from "components/SpeedyLink";

export function PublicationHeader(props: {
  iconUrl?: string;
  publicationName: string;
  description?: string;
  author?: React.ReactNode;
  subscribeButton?: React.ReactNode;
}) {
  return (
    <div className="pubHeader flex flex-col pb-8 w-full text-center justify-center ">
      {props.iconUrl && (
        <div
          className="shrink-0 w-10 h-10 rounded-full mx-auto"
          style={{
            backgroundImage: `url(${props.iconUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      )}
      <h2 className="text-accent-contrast sm:text-xl text-[22px] pt-1 ">
        {props.publicationName}
      </h2>
      <p className="sm:text-lg text-secondary">
        {props.description}{" "}
      </p>
      {props.author}
      <div className="sm:pt-4 pt-4">{props.subscribeButton}</div>
    </div>
  );
}

export function PublicationPostItem(props: {
  href?: string;
  title?: string;
  description?: string;
  date?: React.ReactNode;
  interactions?: React.ReactNode;
}) {
  const content = (
    <>
      {props.title && <h3 className="text-primary">{props.title}</h3>}
      <p className="italic text-secondary line-clamp-3">
        {props.description}
      </p>
    </>
  );

  return (
    <>
      <div className="flex w-full grow flex-col ">
        {props.href ? (
          <SpeedyLink
            href={props.href}
            className="publishedPost no-underline! flex flex-col"
          >
            {content}
          </SpeedyLink>
        ) : (
          <div className="publishedPost no-underline! flex flex-col">
            {content}
          </div>
        )}

        <div className="justify-between w-full text-sm text-tertiary flex gap-1 flex-wrap pt-2 items-center">
          <p className="text-sm text-tertiary ">
            {props.date}{" "}
          </p>
          {props.interactions}
        </div>
      </div>
      <hr className="last:hidden border-border-light" />
    </>
  );
}
