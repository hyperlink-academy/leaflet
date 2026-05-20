import React from "react";

export function PublicationHeader(props: {
  iconUrl?: string;
  publicationName: string;
  description?: string;
  author?: React.ReactNode;
  subscribeButton?: React.ReactNode;
  variant?: "stacked" | "inline";
}) {
  let variant = props.variant ?? "stacked";
  let icon = props.iconUrl ? (
    <div
      className={`shrink-0 rounded-full${variant === "stacked" ? " mx-auto" : ""}`}
      style={{
        width: "calc(40px - 16px * var(--header-shrink, 0))",
        height: "calc(40px - 16px * var(--header-shrink, 0))",
        backgroundImage: `url(${props.iconUrl})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    />
  ) : null;
  let title = (
    <h2
      className={`text-accent-contrast${variant === "stacked" ? " pt-1" : ""}`}
      style={{ fontSize: "calc(22px - 6px * var(--header-shrink, 0))" }}
    >
      {props.publicationName}
    </h2>
  );

  return (
    <div
      className="pubHeader flex flex-col w-full text-center justify-center"
      style={{
        paddingBottom: "calc(32px - 32px * var(--header-shrink, 0))",
        ...(variant === "stacked"
          ? { paddingTop: "calc(4px - 4px * var(--header-shrink, 0))" }
          : null),
      }}
    >
      {variant === "inline" ? (
        <div
          className="flex items-center justify-center"
          style={{ gap: "calc(12px - 6px * var(--header-shrink, 0))" }}
        >
          {icon}
          {title}
        </div>
      ) : (
        <>
          {icon}
          {title}
        </>
      )}
      <div
        className="overflow-hidden"
        style={{
          maxHeight: "calc((1 - var(--header-shrink, 0)) * 400px)",
          opacity: "calc(1 - var(--header-shrink, 0))",
        }}
      >
        {props.description && (
          <p className="sm:text-lg text-secondary">{props.description}</p>
        )}
        {props.author}
        {props.subscribeButton && (
          <div className="sm:pt-4 pt-4">{props.subscribeButton}</div>
        )}
      </div>
    </div>
  );
}
