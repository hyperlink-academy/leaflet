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
  pageWidth?: number;
};

type MediumProps = CommonProps & {
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
      className={`justify-between w-full ${textClassName} text-tertiary flex gap-1 flex-wrap items-center`}
    >
      <p
        className={`${textClassName} text-tertiary flex gap-1 items-center flex-wrap`}
      >
        {hasAuthor && (
          <span className="whitespace-nowrap">
            {author}
            {hasDate && <span className="ml-1">|</span>}
          </span>
        )}
        {hasDate && <span className="whitespace-nowrap">{date}</span>}
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
      <div className="flex w-full grow flex-col gap-1 px-3 py-2">
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

export function PublicationPostItemMedium(props: MediumProps) {
  const hasCoverImage = !!props.coverImageSrc;
  return (
    <>
      <div className="flex w-full gap-3 items-stretch sm:h-36">
        <div className="flex w-full gap-2 grow flex-col justify-between min-w-0  pl-3 py-2">
          <PostLink href={props.href}>
            {props.title && (
              <h3 className="text-primary line-clamp-2">{props.title}</h3>
            )}
            <p className="text-secondary line-clamp-3">
              {props.description} {props.description}
            </p>
          </PostLink>
          <MetaRow
            author={props.author}
            date={props.date}
            interactions={props.interactions}
            textClassName="text-sm place-self-end"
          />
        </div>
        {hasCoverImage && (
          <div className="self-stretch shrink-0 aspect-square  w-16 sm:w-36">
            <img
              src={props.coverImageSrc}
              alt={props.coverImageAlt || props.title || ""}
              className="h-full aspect-square object-cover rounded"
            />
          </div>
        )}
      </div>
      <hr className="last:hidden border-border-light" />
    </>
  );
}

export function PublicationPostItemLarge(props: LargeProps) {
  const hasCoverImage = !!props.coverImageSrc;
  const widePage = (props.pageWidth ?? 0) >= 768;
  const body = (
    <div
      className={`flex w-full grow flex-col gap-2 justify-between ${widePage ? " px-3  py-2 sm:pb-3" : "px-3 py-2 "}`}
    >
      <PostLink href={props.href}>
        {props.title && (
          <h3
            className={`text-primary text-lg clamp-2 ${widePage ? "sm:text-xl " : ""}`}
          >
            {props.title}
          </h3>
        )}
        <p
          className={`text-secondary line-clamp-3 text-base ${widePage ? "sm:text-lg " : ""}`}
        >
          {props.description}
        </p>
      </PostLink>
      <MetaRow
        author={props.author}
        date={props.date}
        interactions={props.interactions}
        textClassName={`${widePage ? "text-sm sm:text-base " : "text-sm "} `}
      />
    </div>
  );

  return (
    <>
      <div
        className={`flex flex-col items-stretch ${widePage ? "sm:flex-row sm:gap-2 gap-0" : ""} w-full  items-start`}
      >
        {hasCoverImage && (
          <div className="w-fit">
            <img
              src={props.coverImageSrc}
              alt={props.coverImageAlt || props.title || ""}
              className="h-full aspect-[1.91:1] object-cover rounded"
            />
          </div>
        )}
        {body}
      </div>
      <hr className="last:hidden border-border-light" />
    </>
  );
}
