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
  text-base font-bold text-white
  flex gap-2 items-center justify-center shrink-0
  disabled:border-grey-90
  disabled:bg-grey-90 disabled:text-grey-80 disabled:hover:text-grey-80
  ${props.className}
`}
    >
      {props.children}
    </button>
  );
}
