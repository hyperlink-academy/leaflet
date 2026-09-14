import React from "react";

export function PostItemCoverImage(props: {
  src: string;
  alt: string;
  locked?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`postItemCover relative overflow-hidden ${props.className || ""}`}
    >
      <img
        src={props.src}
        alt={props.alt}
        className={`absolute inset-0 w-full h-full object-cover ${props.locked ? "blur-[4px] scale-110" : ""}`}
      />
    </div>
  );
}
