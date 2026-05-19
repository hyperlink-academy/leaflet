import React from "react";

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
      <p className="sm:text-lg text-secondary">{props.description} </p>
      {props.author}
      <div className="sm:pt-4 pt-4">{props.subscribeButton}</div>
    </div>
  );
}
