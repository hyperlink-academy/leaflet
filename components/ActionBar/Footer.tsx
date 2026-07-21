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
        px-2 pt-1 pb-3
        flex justify-between
        w-fill
        pwa-padding-x
        h-[calc(38px+(max(var(--safe-padding-bottom),16px))]
       ${props.noBackground ? "bg-bg-page" : "bg-[rgba(var(--bg-page),0.5)] border-t border-border-light"} `}
    >
      {props.children}
    </div>
  );
}
