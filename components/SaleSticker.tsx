// Preserve the sticker's intended portrait ratio so callers only pick a width.
const ASPECT = 96 / 56;

export const SaleSticker = (props: { className?: string; width: number }) => {
  return (
    <div className={`${props.className} shrink-0`}>
      <img
        src={"/about/saleSticker.png"}
        alt={"25% off Yearly Leaflet Pro"}
        width={props.width}
        height={props.width * ASPECT}
      />
    </div>
  );
};
