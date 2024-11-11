import Link from "next/link";
import { LogoSmall, LogoTiny } from "./Icons";
import { theme } from "tailwind.config";

export const Watermark = (props: { mobile?: boolean }) => {
  return (
    <div className="pb-2 pr-2 group/watermark">
      <div
        className="hidden  group-hover/watermark:block whitespace-nowrap text-sm sm:rotate-180 text-tertiary sm:pt-2 mr-0"
        style={!props.mobile ? { writingMode: "vertical-lr" } : {}}
      >
        made using <span className=" font-bold text-accent-1">Leaflet</span>
      </div>
      <Link
        className="font-bold text-border group-hover/watermark:text-accent-1"
        href="/"
      >
        <LogoSmall strokeColor={theme.colors["bg-page"]} />
      </Link>
    </div>
  );
};
