import React from "react";
import { SpeedyLink } from "components/SpeedyLink";

type CommonProps = {
  href?: string;
  title?: string;
  description?: string;
  author?: React.ReactNode;
  date?: React.ReactNode;
  interactions?: React.ReactNode;
  footer?: React.ReactNode;
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
        className="publishedPost no-underline! flex flex-col grow"
      >
        {children}
      </SpeedyLink>
    );
  }
  return (
    <div className="publishedPost no-underline! flex flex-col grow">
      {children}
    </div>
  );
}

export function PublicationPostItemSmall(props: CommonProps) {
  return (
    <div className="flex w-full grow flex-col px-3 py-2">
      <PostLink href={props.href}>
        {props.title && (
          <h3 className="text-primary leading-snug pb-1">{props.title}</h3>
        )}
      </PostLink>
      <MetaRow
        author={props.author}
        date={props.date}
        interactions={props.interactions}
        textClassName="text-sm"
      />
      {props.footer}
    </div>
  );
}

export function PublicationPostItemMedium(props: MediumProps) {
  const hasCoverImage = !!props.coverImageSrc;

  return (
    <div className="flex w-full items-stretch ">
      <div className="flex w-full grow flex-col justify-between min-w-0  pl-3 pr-3 py-2">
        <PostLink href={props.href}>
          {props.title && (
            <h3 className="text-primary leading-snug line-clamp-2 pb-1">
              {props.title}
            </h3>
          )}
          <p className="text-secondary line-clamp-3 grow mb-2">
            {props.description}
          </p>
        </PostLink>
        <MetaRow
          author={props.author}
          date={props.date}
          interactions={props.interactions}
          textClassName="text-sm place-self-end"
        />
        <div className="shrink-0">{props.footer}</div>
      </div>
      {hasCoverImage && (
        <div
          className={`self-start shrink-0 w-16  border-l border-border-light ${props.footer ? " w-[182px] h-[182px]" : "sm:h-36 sm:w-36"}`}
        >
          <img
            src={props.coverImageSrc}
            alt={props.coverImageAlt || props.title || ""}
            className="w-full aspect-square object-cover rounded"
          />
        </div>
      )}
    </div>
  );
}

export function PublicationPostItemLarge(props: LargeProps) {
  const hasCoverImage = !!props.coverImageSrc;
  const widePage = (props.pageWidth ?? 0) >= 768;
  const body = (
    <div
      className={`min-w-0 flex w-full grow flex-col ${widePage ? " px-3 py-2 sm:pb-3" : "px-3 py-2 "}`}
    >
      <div className="flex flex-col grow w-full min-w-0 justify-between gap-2">
        <PostLink href={props.href}>
          {props.title && (
            <h3
              className={`text-primary leading-snug text-lg pb-1  clamp-2 ${widePage ? "sm:text-xl " : ""}`}
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
      <div className="shrink-0 flex flex-col ">{props.footer}</div>
    </div>
  );

  return (
    <>
      <div
        className={`flex flex-col items-stretch ${widePage ? "sm:flex-row sm:gap-2 gap-0" : ""} w-full  items-start`}
      >
        {hasCoverImage && (
          <img
            src={props.coverImageSrc}
            alt={props.coverImageAlt || props.title || ""}
            className={`${widePage ? "sm:h-[244px] aspect-[3/2]" : "h-full aspect-[1.91/1]"}  object-cover rounded`}
          />
        )}
        {body}
      </div>
    </>
  );
}
