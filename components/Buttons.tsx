import React from "react";

type ButtonProps = Omit<JSX.IntrinsicElements["button"], "content">;
export function ButtonPrimary(
  props: {
    children: React.ReactNode;
  } & ButtonProps,
) {
  return (
    <button
      {...props}
      className={`m-0 px-2 py-0.5 w-max h-max
  bg-accent-1 outline-offset-[-2px] active:outline active:outline-2
  border border-accent-1 rounded-md
  text-base font-bold text-accent-2
  flex gap-2 items-center justify-center shrink-0
  disabled:border-border-light
  disabled:bg-border-light disabled:text-border disabled:hover:text-border
  ${props.className}
`}
    >
      {props.children}
    </button>
  );
}

export const HoverButton = (props: {
  icon: React.ReactNode;
  label: string;
  background: string;
  text: string;
  backgroundImage?: React.CSSProperties;
  noLabelOnMobile?: boolean;
}) => {
  return (
    <div className="sm:w-8 sm:h-8 relative ">
      <div
        className={`
          z-10 group/hover-button
          w-max h-max rounded-full p-1 flex gap-2
          sm:absolute top-0 left-0
          place-items-center justify-center
          ${props.background} ${props.text}`}
        style={props.backgroundImage}
      >
        {props.icon}
        <div
          className={`font-bold pr-[6px] group-hover/hover-button:block ${props.noLabelOnMobile ? "hidden" : "sm:hidden"}`}
        >
          {props.label}
        </div>
      </div>
    </div>
  );
};
