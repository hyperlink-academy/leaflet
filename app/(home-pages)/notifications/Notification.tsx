import { Avatar } from "components/Avatar";
import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/BaseTextBlock";
import { PubLeafletPublication, PubLeafletRichtextFacet } from "lexicons/api";

export const Notification = (props: {
  icon: React.ReactNode;
  actionText: React.ReactNode;
  content?: React.ReactNode;
  cardBorderHidden?: boolean;
  href: string;
}) => {
  return (
    <div
      className={`relative flex flex-col w-full  ${
        props.cardBorderHidden
          ? ""
          : " block-border border-border! hover:outline-border sm:p-4 px-3 pl-2 sm:pl-3 pt-2 sm:pt-3!"
      }`}
      style={{
        backgroundColor: props.cardBorderHidden
          ? "transparent"
          : "rgba(var(--bg-page), var(--bg-page-alpha))",
      }}
    >
      <a
        href={props.href}
        className=" absolute top-0 bottom-0 left-0 right-0"
      />
      <div className={`flex flex-row gap-2 items-center`}>
        <div className="text-secondary shrink-0">{props.icon}</div>
        <div className="text-secondary font-bold">{props.actionText}</div>
      </div>
      {props.content && (
        <div className="flex flex-row gap-2 mt-1 w-full">
          <div className="w-4 shrink-0" />
          {props.content}
        </div>
      )}
    </div>
  );
};

export const ContentLayout = (props: {
  children: React.ReactNode;
  postTitle: string;
  pubRecord?: PubLeafletPublication.Record;
  cardBorderHidden: boolean;
}) => {
  return (
    <div
      className={`border border-border-light rounded-md px-2 py-[6px] w-full ${props.cardBorderHidden ? "transparent" : "bg-bg-page"}`}
    >
      <div className="text-tertiary text-sm italic font-bold pb-1">
        {props.postTitle}
      </div>
      {props.children}
      {props.pubRecord && (
        <>
          <hr className="mt-3 mb-1 border-border-light" />
          <a
            href={`https://${props.pubRecord.base_path}`}
            className="relative text-xs text-tertiary flex gap-[6px] items-center font-bold hover:no-underline!"
          >
            {props.pubRecord.name}
          </a>
        </>
      )}
    </div>
  );
};

type Facet = PubLeafletRichtextFacet.Main;
export const CommentInNotification = (props: {
  avatar: string | undefined;
  displayName: string;
  plaintext: string;
  facets?: Facet[];
  index: number[];
  className?: string;
}) => {
  return (
    <div className=" flex gap-2 text-sm w-full ">
      <Avatar src={props.avatar} displayName={props.displayName} />
      <pre
        style={{ wordBreak: "break-word" }}
        className={`whitespace-pre-wrap text-secondary line-clamp-3 sm:line-clamp-6 ${props.className}`}
      >
        <BaseTextBlock
          preview
          index={props.index}
          plaintext={props.plaintext}
          facets={props.facets}
        />
      </pre>
    </div>
  );
};
