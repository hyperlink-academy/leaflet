import { ReactNode } from "react";
import { GalleryItemClasses } from "./shared";

export function ImageGalleryStrip(props: {
  count: number;
  gap: number;
  renderItem: (index: number, classes: GalleryItemClasses) => ReactNode;
}) {
  return (
    <div className="flex flex-col w-full" style={{ gap: `${props.gap}px` }}>
      {Array.from({ length: props.count }).map((_, i) => (
        <div key={i} className="contents">
          {props.renderItem(i, {
            className: "w-full",
            buttonClassName: "block w-full",
            imgClassName: "w-full h-auto",
          })}
        </div>
      ))}
    </div>
  );
}
