import { Media } from "components/Media";

export function Footer(props: { children?: React.ReactNode }) {
  return (
    <Media
      mobile
      className={`
        actionFooter touch-none shrink-0
        w-full z-10
        px-2 pt-1 pwa-padding-bottom
        flex justify-between
        h-[calc(38px+var(--safe-padding-bottom))]
        bg-[rgba(var(--bg-page),0.5)] border-top border-bg-page`}
    >
      {props.children}
    </Media>
  );
}
