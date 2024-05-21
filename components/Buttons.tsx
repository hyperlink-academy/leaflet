type ButtonProps = Omit<JSX.IntrinsicElements["button"], "content">;
export function ButtonPrimary(
  props: {
    children: React.ReactNode;
  } & ButtonProps,
) {
  return (
    <button
      {...props}
      className={`m-0 px-2 py-0.5 w-max
  bg-accent outline-offset-[-2px] active:outline active:outline-2
  border border-accent rounded-md
  text-base font-bold text-accentText
  flex gap-2 items-center justify-center shrink-0
  disabled:border-border-light
  disabled:bg-border-light disabled:text-border disabled:hover:text-border
  ${props.className}
`}
    >
      {props.children}
    </button>
  );
}
