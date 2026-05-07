import { Media } from "components/Media";

export function DefaultFooter(props: { children?: React.ReactNode }) {
  return (
    <Media
      mobile
      className={`
        actionFooter touch-none shrink-0 z-10
        px-2 pt-1 pwa-padding-bottom
        flex justify-between
        [width:-webkit-fill-available]
        pwa-padding-x
        h-[calc(38px+var(--safe-padding-bottom))]
        bg-[rgba(var(--bg-page),0.5)] border-top border-bg-page`}
    >
      {props.children}
    </Media>
  );
}
