export const Separator = (props: { classname?: string }) => {
  return <div className={`h-full border-r border-border ${props.classname}`} />;
};

export const ShortcutKey = (props: { children: React.ReactNode }) => {
  return (
    <span>
      <code className="min-w-6 w-fit text-xs text-primary bg-border-light border border-secondary rounded-md px-0.5  flex justify-center font-bold ">
        {props.children}
      </code>
    </span>
  );
};
