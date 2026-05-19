import React from "react";
import { SpeedyLink } from "components/SpeedyLink";

type CommonProps = {
  href?: string;
  title?: string;
  description?: string;
  author?: React.ReactNode;
  date?: React.ReactNode;
  interactions?: React.ReactNode;
};

type LargeProps = CommonProps & {
  coverImageSrc?: string;
  coverImageAlt?: string;
};

function MetaRow({
  author,
  date,
  interactions,
  textClassName,
}: {
  author?: React.ReactNode;
  date?: React.ReactNode;
  interactions?: React.ReactNode;
  textClassName: string;
}) {
  const hasAuthor = author !== undefined && author !== null;
  const hasDate = date !== undefined && date !== null;
  return (
    <div
      className={`justify-between w-full ${textClassName} text-tertiary flex gap-1 flex-wrap pt-2 items-center`}
    >
      <p className={`${textClassName} text-tertiary flex gap-1 items-center`}>
        {hasAuthor && <span>{author}</span>}
        {hasAuthor && hasDate && <span>|</span>}
        {hasDate && <span>{date}</span>}
      </p>
      {interactions}
    </div>
  );
}

function PostLink({
  href,
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <SpeedyLink
        href={href}
        className="publishedPost no-underline! flex flex-col"
      >
        {children}
      </SpeedyLink>
    );
  }
  return (
    <div className="publishedPost no-underline! flex flex-col">{children}</div>
  );
}

export function PublicationPostItemSmall(props: CommonProps) {
  return (
    <>
      <div className="flex w-full grow flex-col">
        <PostLink href={props.href}>
          {props.title && <h3 className="text-primary">{props.title}</h3>}
        </PostLink>
        <MetaRow
          author={props.author}
          date={props.date}
          interactions={props.interactions}
          textClassName="text-sm"
        />
      </div>
      <hr className="last:hidden border-border-light" />
    </>
  );
}

export function PublicationPostItemMedium(props: CommonProps) {
  return (
    <>
      <div className="flex w-full grow flex-col">
        <PostLink href={props.href}>
          {props.title && <h3 className="text-primary">{props.title}</h3>}
          <p className="italic text-secondary line-clamp-3">
            {props.description}
          </p>
        </PostLink>
        <MetaRow
          author={props.author}
          date={props.date}
          interactions={props.interactions}
          textClassName="text-sm"
        />
      </div>
      <hr className="last:hidden border-border-light" />
    </>
  );
}

export function PublicationPostItemLarge(props: LargeProps) {
  const hasCoverImage = !!props.coverImageSrc;
  const body = (
    <div className="flex w-full grow flex-col">
      <PostLink href={props.href}>
        {props.title && (
          <h3 className="text-primary text-xl sm:text-2xl">{props.title}</h3>
        )}
        <p className="italic text-secondary line-clamp-3 text-lg">
          {props.description}
        </p>
      </PostLink>
      <MetaRow
        author={props.author}
        date={props.date}
        interactions={props.interactions}
        textClassName="text-base"
      />
    </div>
  );

  return (
    <>
      <div className="flex w-full gap-4 items-start">
        {hasCoverImage && (
          <div className="shrink-0 w-1/3 max-w-[240px]">
            <img
              src={props.coverImageSrc}
              alt={props.coverImageAlt || props.title || ""}
              className="w-full h-auto aspect-video object-cover rounded"
            />
          </div>
        )}
        {body}
      </div>
      <hr className="last:hidden border-border-light" />
    </>
  );
}
