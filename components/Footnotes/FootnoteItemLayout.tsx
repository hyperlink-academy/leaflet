import { ReactNode } from "react";
import {
  FootnoteSourcePreview,
  useFootnoteSourcePreview,
} from "./FootnoteSourcePreview";

export function FootnoteItemLayout(props: {
  index: number;
  indexAction?: () => void;
  indexHref?: string;
  // When set, the index previews the footnote's source block on hover/tap.
  sourcePreview?: FootnoteSourcePreview;
  children: ReactNode;
  trailing?: ReactNode;
  id?: string;
  className?: string;
}) {
  let { triggerProps, popover } = useFootnoteSourcePreview(
    props.sourcePreview,
    props.indexAction,
  );
  let indexClassName =
    "text-tertiary font-medium shrink-0 text-sm leading-normal no-underline hover:underline cursor-pointer w-7 text-right";

  let indexContent = <>{props.index}.</>;

  return (
    <div
      id={props.id}
      className={`footnote-item flex items-start gap-2 text-sm group/footnote${props.className ?? ""}`}
    >
      {props.indexHref ? (
        <a href={props.indexHref} className={indexClassName} {...triggerProps}>
          {indexContent}
        </a>
      ) : (
        <button
          className={indexClassName}
          title="Jump to footnote in text"
          {...triggerProps}
        >
          {indexContent}
        </button>
      )}
      {popover}
      <div
        className="grow min-w-0 text-secondary whitespace-pre-wrap [&_.ProseMirror]:outline-hidden"
        style={{ wordBreak: "break-word" }}
      >
        {props.children}
      </div>
      {props.trailing}
    </div>
  );
}

export function FootnoteSectionLayout(props: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`footnote-section px-3 sm:px-4 pb-2 ${props.className ?? ""}`}
    >
      <hr className="border-border-light mb-3" />
      <div className="flex flex-col gap-2">{props.children}</div>
    </div>
  );
}
