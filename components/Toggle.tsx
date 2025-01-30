export const Toggle = (props: {
  children: React.ReactNode;
  className?: string;
  checked: boolean;
  onChange: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  return (
    <div className="flex justify-between">
      {props.children}
      <button
        className={`
          shrink-0 relative
          rounded-full h-5 w-9 mt-0.5
          ${props.checked ? "bg-accent-1" : "bg-border-light"}`}
        onClick={(e) => props.onChange(e)}
      >
        <div
          className={`
            absolute top-0.5
            rounded-full bg-accent-2 h-4 w-4
            ${props.checked ? "right-0.5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
};
