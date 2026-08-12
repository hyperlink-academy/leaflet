export const FeedLayout = (props: { children: React.ReactNode }) => {
  return (
    // relative so the feeds' absolutely-positioned load-more trigger
    // (`bottom-96`) anchors to the end of the list, not the scroll container —
    // anchored to the scroll container it sits in the initial viewport and
    // pages in the entire feed unprompted.
    <div className="relative flex flex-col gap-6 w-full max-w-lg mx-auto">
      {props.children}
    </div>
  );
};
