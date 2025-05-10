import { Media } from "components/Media";

export function Footer(props: { children?: React.ReactNode }) {
  return (
    <Media
      mobile
      className={`
        actionFooter touch-none
        w-full z-10
        px-2 pt-1 pb-2 pwa-padding-bottom
        flex justify-start
        h-[45px]
        bg-bg-page bg-opacity-50 border-top border-bg-page`}
    >
      {props.children}
    </Media>
  );
}
