import Link from "next/link";

export const Watermark = (props: { mobile?: boolean }) => {
  return (
    <div
      className="whitespace-nowrap text-xs sm:rotate-180 text-tertiary sm:pt-2 mr-0 "
      style={!props.mobile ? { writingMode: "vertical-lr" } : {}}
    >
      made using{" "}
      <Link className="font-bold" href="/">
        Leaflet
      </Link>
    </div>
  );
};
