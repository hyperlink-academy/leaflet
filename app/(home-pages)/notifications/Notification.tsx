import { Avatar } from "components/Avatar";
import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/BaseTextBlock";
import { PubLeafletPublication, PubLeafletRichtextFacet } from "lexicons/api";
import { useEntity, useReplicache } from "src/replicache";

export const Notification = (props: {
  icon: React.ReactNode;
  actionText: React.ReactNode;
  content?: React.ReactNode;
  cardBorderHidden?: boolean;
}) => {
  let { rootEntity } = useReplicache();
  let cardBorderHidden = useEntity(rootEntity, "theme/card-border-hidden")?.data
    .value;

  return (
    <div
      className={`flex flex-col w-full sm:p-4 px-3 pl-2 sm:pl-3 pt-2 sm:pt-3! ${
        cardBorderHidden
          ? ""
          : " block-border border-border! hover:outline-border "
      }`}
      style={{
        backgroundColor: cardBorderHidden
          ? "transparent"
          : "rgba(var(--bg-page), var(--bg-page-alpha))",
      }}
    >
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
  publication: PubLeafletPublication.Record;
}) => {
  let { rootEntity } = useReplicache();
  let cardBorderHidden = useEntity(rootEntity, "theme/card-border-hidden")?.data
    .value;

  return (
    <div
      className={`border border-border-light rounded-md px-2 py-[6px] w-full ${cardBorderHidden ? "transparent" : "bg-bg-page"}`}
    >
      <div className="text-tertiary text-sm italic font-bold pb-1">
        {props.postTitle}
      </div>
      {props.children}
      <hr className="mt-2 mb-1 border-border-light" />

      <div className="text-xs text-tertiary flex gap-[6px] items-center">
        {props.publication.name}
      </div>
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
