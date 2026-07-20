export const LeafletLayout = (props: {
  children: React.ReactNode;
  className?: string;
  // In flow mode the layout does NOT create its own scroll container: it sizes
  // to its content height so an ancestor (e.g. the publication edit layout) can
  // be the single vertical scroller. See app/(published)/lish/.../edit/layout.tsx.
  flow?: boolean;
}) => {
  return (
    <div
      className={`
        leafetLayout
        w-full relative
        mx-auto pwa-padding
        flex items-stretch
        ${props.flow ? "" : "h-full grow"}`}
      id="page-carousel"
    >
      {/* if you adjust this padding, remember to adjust the negative margins on page in components/Pages/Page.tsx in pageScrollWrapper when card borders are hidden */}
      <div
        id="pages"
        className={`pagesWrapper
          w-full
          flex gap-0
          py-2 sm:py-6
          no-scrollbar
          ${props.flow ? "justify-center" : "h-full overflow-y-hidden overflow-x-scroll snap-x snap-mandatory"}
          ${props.className}`}
      >
        {props.children}
      </div>
    </div>
  );
};

export const BookendSpacer = (props: {
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
  noWidth?: boolean;
  className?: string;
}) => {
  // these spacers are used between pages so that the page carousel can fit two pages side by side by snapping in between pages
  return (
    <div
      onClick={props.onClick}
      className={`spacer shrink-0 lg:snap-center ${props.noWidth ? "w-0" : "w-6"} ${props.className}`}
    />
  );
};
