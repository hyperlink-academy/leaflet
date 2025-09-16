export const LeafletLayout = (props: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`
        leafetLayout
        w-full h-full relative
        mx-auto pwa-padding
        flex items-stretch  grow`}
      id="page-carousel"
    >
      {/* if you adjust this padding, remember to adjust the negative margins on page
        in [rkey]/page/PostPage when card borders are hidden */}
      <div
        id="pages"
        className={`pagesWrapper
          w-full h-full
          flex gap-0
          py-2 sm:py-6
          overflow-x-scroll snap-x snap-mandatory no-scrollbar
          ${props.className}`}
      >
        {props.children}
      </div>
    </div>
  );
};

export const BookendSpacers = (props: {
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}) => {
  // these spacers go at the end of the first and last pages so that those pages can be scrolled to the center of the screen
  return (
    <div
      className="spacer shrink-0 flex justify-end items-start"
      style={{ width: `calc(50vw - ((var(--page-width-units)/2))` }}
      onClick={props.onClick ? props.onClick : () => {}}
    >
      {props.children}
    </div>
  );
};

export const SandwichSpacer = (props: {
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}) => {
  // these spacers are used between pages so that the page carousel can fit two pages side by side by snapping in between pages
  return (
    <div
      onClick={props.onClick}
      className={`spacer shrink-0 w-6 lg:snap-center ${props.className}`}
    />
  );
};
