"use client";
import { useIsInitialRender, useIsMobile } from "src/hooks/isMobile";

export function Media(props: {
  mobile: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  let initialRender = useIsInitialRender();
  let isMobile = useIsMobile();
  if (initialRender)
    return (
      <div
        className={`${props.mobile ? "sm:hidden" : "hidden sm:block"} ${props.className}`}
      >
        {props.children}
      </div>
    );
  if ((isMobile && props.mobile) || (!isMobile && !props.mobile))
    return <div className={props.className}>{props.children}</div>;
  return null;
}

export function MediaContents(props: {
  mobile: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  let initialRender = useIsInitialRender();
  let isMobile = useIsMobile();
  if (initialRender)
    return (
      <div
        className={`${props.mobile ? "sm:hidden contents" : "hidden sm:contents"} ${props.className}`}
      >
        {props.children}
      </div>
    );
  if ((isMobile && props.mobile) || (!isMobile && !props.mobile))
    return <div className={props.className}>{props.children}</div>;
  return null;
}
