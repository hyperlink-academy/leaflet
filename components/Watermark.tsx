import { theme } from "tailwind.config";
import { useEntity, useReplicache } from "src/replicache";
import { LogoSmall } from "./Icons/LogoSmall";

export const Watermark = (props: { mobile?: boolean }) => {
  let { rootEntity } = useReplicache();
  let showWatermark = useEntity(rootEntity, "theme/page-leaflet-watermark");
  if (!showWatermark?.data.value) return null;
  return (
    <a
      href="https://about.leaflet.pub"
      className="hover:no-underline w-fit italic"
      target="_blank"
    >
      <div className="sm:mb-2 sm:ml-4 group/watermark flex sm:flex-col gap-2 items-center justify-center ">
        <div
          className="sm:hidden group-hover/watermark:block sm:rotate-180 sm:py-1 sm:px-0 px-1 w-max rounded-md h-fit whitespace-nowrap text-sm  text-tertiary"
          style={{
            writingMode: !props.mobile ? "vertical-lr" : "horizontal-tb",
            backgroundColor: "rgba(var(--bg-page), 0.7)",
          }}
        >
          made using <span className="text-accent-1 font-bold">Leaflet</span>
        </div>
        <LogoSmall
          strokeColor={theme.colors["bg-page"]}
          className="text-accent-1 sm:text-tertiary group-hover/watermark:text-accent-1"
        />
      </div>
    </a>
  );
};
