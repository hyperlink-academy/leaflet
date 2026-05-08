import { Media } from "components/Media";

export function FooterLayout(props: {
  children?: React.ReactNode;
  onMouseDown?: (e: React.MouseEvent) => void;
  noBackground?: boolean;
}) {
  return (
    <div
      onMouseDown={props.onMouseDown}
      className={`
        leafletFooter touch-none shrink-0 z-10
        px-2 pt-1 pb-2
        flex justify-between
        [width:-webkit-fill-available]
        pwa-padding-x
        h-[calc(38px+(max(var(--safe-padding-bottom),16px))]
       ${props.noBackground ? "bg-bg-page" : "bg-[rgba(var(--bg-page),0.5)] border-top border-bg-page"} `}
    >
      {props.children}
    </div>
  );
}
