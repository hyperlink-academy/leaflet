import Link from "next/link";
import { LogoSmall, LogoTiny } from "./Icons";
import { theme } from "tailwind.config";

export const Watermark = (props: { mobile?: boolean }) => {
  return (
    <Link href="/">
      <div className="sm:mb-2 sm:mr-4 group/watermark flex sm:flex-col gap-2 items-center justify-center ">
        <div
          className="hidden group-hover/watermark:block sm:rotate-180 sm:py-1 sm:px-0 px-1 w-max rounded-md h-fit whitespace-nowrap text-sm  text-tertiary  hover:no-underline"
          style={{
            writingMode: !props.mobile ? "vertical-lr" : "horizontal-tb",
            backgroundColor: "rgba(var(--bg-page), 0.6)",
          }}
        >
          made using <span className="text-accent-1">Leaflet</span>
        </div>
        <LogoSmall
          strokeColor={theme.colors["bg-page"]}
          className="text-tertiary group-hover/watermark:text-accent-1"
        />
      </div>
    </Link>
  );
};
