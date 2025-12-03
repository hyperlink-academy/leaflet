export const EmptyState = (props: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`
        flex flex-col gap-2 justify-between
        container bg-[rgba(var(--bg-page),.7)]
        sm:p-4 p-3 mt-2
        text-center text-tertiary
        ${props.className}`}
    >
      {props.children}
    </div>
  );
};
