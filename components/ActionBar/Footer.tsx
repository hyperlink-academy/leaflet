import { Media } from "components/Media";

export function Footer(props: { children?: React.ReactNode }) {
  return (
    <Media
      mobile
      className={`
        actionFooter touch-none
        w-full z-10
        px-2 pt-1 pwa-padding-bottom
        flex justify-start
        h-[calc(45px+var(--safe-padding-bottom))]
        bg-bg-page bg-opacity-50 border-top border-bg-page`}
    >
      {props.children}
    </Media>
  );
}
