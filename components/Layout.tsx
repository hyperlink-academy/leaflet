export const Separator = (props: { classname?: string }) => {
  return (
    <div className={`min-h-full border-r border-border ${props.classname}`} />
  );
};

export const Menu = (props: { children?: React.ReactNode }) => {
  return (
    <div className="dropdownMenu bg-bg-card flex flex-col py-1 gap-0.5 border border-border rounded-md shadow-md">
      {props.children}
    </div>
  );
};

export const MenuItem = (props: {
  children?: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
}) => {
  return (
    <button
      onClick={(e) => props.onClick(e)}
      className="MenuItem font-bold z-10 text-left text-secondary py-1 px-3 flex gap-2 hover:bg-border-light hover:text-secondary "
    >
      {props.children}
    </button>
  );
};

export const ShortcutKey = (props: { children: React.ReactNode }) => {
  return (
    <span>
      <code className="min-w-6 w-fit text-xs text-primary bg-border-light border border-secondary rounded-md px-0.5  flex justify-center ">
        {props.children}
      </code>
    </span>
  );
};
