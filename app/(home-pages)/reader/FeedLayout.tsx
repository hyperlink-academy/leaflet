export const FeedLayout = (props: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto">
      {props.children}
    </div>
  );
};
